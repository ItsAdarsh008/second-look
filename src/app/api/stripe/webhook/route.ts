import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { BillingError, fulfillCheckout } from "@/lib/billing";
import { StripeClientError, constructWebhookEvent } from "@/lib/clients/stripe";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook — Stripe's events for this app. Fulfillment lives here: the return page
 * also fulfills, but a buyer who closes the tab before it loads still gets their reviews.
 *
 * Subscribe the endpoint to checkout.session.completed, checkout.session.async_payment_succeeded
 * and checkout.session.async_payment_failed. A non-2xx response makes Stripe retry for up to three
 * days, so only a failure worth retrying (the store being down) returns one.
 */
export async function POST(request: Request) {
  // The signature covers the exact bytes Stripe sent, so read the raw body, not parsed JSON.
  const body = await request.text();
  let event;
  try {
    event = constructWebhookEvent(body, request.headers.get("stripe-signature"));
  } catch (err) {
    const code = err instanceof StripeClientError ? err.code : "invalid_event";
    log.warn("billing.webhook", { outcome: "rejected", code });
    return code === "not_configured"
      ? apiError("not_configured", "Webhooks aren't set up on this deployment.", 503)
      : apiError("invalid_signature", "Webhook signature verification failed.", 400);
  }

  if (event.type === "other") return NextResponse.json({ received: true });

  if (event.type === "checkout.session.async_payment_failed") {
    log.warn("billing.webhook", { outcome: "async_payment_failed", event: event.id });
    return NextResponse.json({ received: true });
  }

  try {
    const outcome = await fulfillCheckout(event.session);
    log.info("billing.webhook", { outcome: outcome.status, type: event.type, event: event.id });
    return NextResponse.json({ received: true });
  } catch (err) {
    // A session some other integration on the same Stripe account created: not ours, don't retry.
    if (err instanceof BillingError && err.code === "invalid_purchase") {
      log.info("billing.webhook", { outcome: "ignored", event: event.id });
      return NextResponse.json({ received: true });
    }
    log.error("billing.webhook", { outcome: "failed", event: event.id, reason: err instanceof Error ? err.name : "unknown" });
    return apiError("fulfillment_failed", "Fulfillment failed; Stripe will retry.", 500);
  }
}
