import "server-only";
import Stripe from "stripe";
import { z } from "zod";

/**
 * Typed client for the few Stripe calls Second Look makes: create a Checkout Session for a credit
 * pack, read one back, and verify webhook events. Everything that leaves this file has been
 * narrowed by Zod, so the rest of the app never touches Stripe's own types.
 */

export class StripeClientError extends Error {
  readonly code: "not_configured" | "invalid_signature" | "request_failed";
  readonly requestId: string | null;
  constructor(code: StripeClientError["code"], message: string, requestId: string | null = null) {
    super(message);
    this.name = "StripeClientError";
    this.code = code;
    this.requestId = requestId;
  }
}

const API_VERSION = "2026-08-26.dahlia";

/** Tags this app's sessions in the Dashboard, so they can be told apart from any other checkout flow. */
const INTEGRATION_IDENTIFIER = "second-look-credit-packs-qhzmvtra";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let cached: Stripe | null = null;

function client(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeClientError("not_configured", "Payments are not configured on this deployment.");
  cached ??= new Stripe(key, {
    apiVersion: API_VERSION,
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: "Second Look" },
  });
  return cached;
}

async function call<T>(what: string, run: (stripe: Stripe) => Promise<T>): Promise<T> {
  const stripe = client();
  try {
    return await run(stripe);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      throw new StripeClientError("request_failed", `Stripe ${what} failed: ${err.type}${err.code ? ` (${err.code})` : ""}.`, err.requestId ?? null);
    }
    throw new StripeClientError("request_failed", `Stripe ${what} failed.`);
  }
}

export const CheckoutSessionSchema = z.object({
  id: z.string(),
  status: z.enum(["open", "complete", "expired"]).nullable(),
  payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
  client_reference_id: z.string().nullable(),
  metadata: z.record(z.string(), z.string()).nullable(),
  amount_total: z.number().nullable(),
  currency: z.string().nullable(),
  url: z.string().nullable(),
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

function narrow(session: unknown): CheckoutSession {
  const parsed = CheckoutSessionSchema.safeParse(session);
  if (!parsed.success) throw new StripeClientError("request_failed", "Stripe returned a Checkout Session in an unexpected shape.");
  return parsed.data;
}

export interface CreateCheckoutParams {
  /** Our reference for the buyer: the wallet the reviews go to. */
  clientReferenceId: string;
  productName: string;
  productDescription: string;
  unitAmountCents: number;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Stripe enables Managed Payments by default on new accounts, which makes Stripe the merchant of
 * record and requires a `tax_code` on every line item — inline `price_data` without one is rejected
 * outright ("the product tax code is missing", HTTP 400). Second Look stays the merchant of record
 * and collects no tax, so it opts out per session.
 *
 * Spread rather than written inline: the parameter is live on API version 2026-08-26.dahlia but not
 * yet in the Node SDK's types (22.6.2 is the latest stable), and a spread skips TypeScript's
 * excess-property check without resorting to a cast.
 */
const MANAGED_PAYMENTS_OFF = { managed_payments: { enabled: false } } as const;

/**
 * A hosted Checkout page for a one-time purchase. Payment methods are left to the Dashboard
 * (dynamic payment methods), and tax isn't collected: turn on Stripe Tax only with a registration.
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession> {
  const session = await call("checkout.sessions.create", (stripe) =>
    stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: params.unitAmountCents,
            product_data: { name: params.productName, description: params.productDescription },
          },
        },
      ],
      client_reference_id: params.clientReferenceId,
      metadata: params.metadata,
      payment_intent_data: { metadata: params.metadata },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      integration_identifier: INTEGRATION_IDENTIFIER,
      ...MANAGED_PAYMENTS_OFF,
    }),
  );
  return narrow(session);
}

export async function retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
  return narrow(await call("checkout.sessions.retrieve", (stripe) => stripe.checkout.sessions.retrieve(id)));
}

const EventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({ object: z.unknown() }),
});

export type WebhookEvent =
  | { id: string; type: "checkout.session.completed" | "checkout.session.async_payment_succeeded" | "checkout.session.async_payment_failed"; session: CheckoutSession }
  | { id: string; type: "other"; stripeType: string };

const CHECKOUT_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"]);

/** Verify a webhook's signature against STRIPE_WEBHOOK_SECRET and narrow the event. `body` must be the raw request body. */
export function constructWebhookEvent(body: string, signature: string | null): WebhookEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new StripeClientError("not_configured", "STRIPE_WEBHOOK_SECRET is not set.");
  if (!signature) throw new StripeClientError("invalid_signature", "Missing Stripe-Signature header.");

  let raw: unknown;
  try {
    raw = client().webhooks.constructEvent(body, signature, secret);
  } catch {
    throw new StripeClientError("invalid_signature", "Webhook signature verification failed.");
  }

  const event = EventSchema.safeParse(raw);
  if (!event.success) throw new StripeClientError("request_failed", "Stripe sent an event in an unexpected shape.");
  const { id, type, data } = event.data;
  if (!CHECKOUT_EVENTS.has(type)) return { id, type: "other", stripeType: type };
  return { id, type: type as Exclude<WebhookEvent["type"], "other">, session: narrow(data.object) };
}
