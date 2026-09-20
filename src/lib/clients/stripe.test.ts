import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StripeClientError, constructWebhookEvent } from "./stripe";

const SECRET = "whsec_test_secret";
const signer = new Stripe("rk_test_placeholder");

function event(type: string, object: Record<string, unknown>) {
  return JSON.stringify({ id: "evt_1", object: "event", type, data: { object } });
}

const session = {
  id: "cs_test_abc",
  object: "checkout.session",
  status: "complete",
  payment_status: "paid",
  client_reference_id: "7KQ2MXV9D4HJN8RT3BWP",
  metadata: { wallet: "7KQ2MXV9D4HJN8RT3BWP", pack: "starter", reviews: "10" },
  amount_total: 1500,
  currency: "usd",
  url: null,
};

describe("constructWebhookEvent", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "rk_test_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("verifies a signed checkout event and narrows its session", () => {
    const payload = event("checkout.session.completed", session);
    const parsed = constructWebhookEvent(payload, signer.webhooks.generateTestHeaderString({ payload, secret: SECRET }));
    expect(parsed).toMatchObject({ type: "checkout.session.completed", session: { id: "cs_test_abc", payment_status: "paid" } });
  });

  it("rejects a tampered body", () => {
    const payload = event("checkout.session.completed", session);
    const header = signer.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect(() => constructWebhookEvent(payload.replace('"starter"', '"agency"'), header)).toThrow(StripeClientError);
  });

  it("rejects a body signed with another secret, or unsigned", () => {
    const payload = event("checkout.session.completed", session);
    expect(() => constructWebhookEvent(payload, signer.webhooks.generateTestHeaderString({ payload, secret: "whsec_other" }))).toThrow(
      expect.objectContaining({ code: "invalid_signature" }),
    );
    expect(() => constructWebhookEvent(payload, null)).toThrow(expect.objectContaining({ code: "invalid_signature" }));
  });

  it("passes other event types through untouched", () => {
    const payload = event("charge.refunded", { id: "ch_1" });
    expect(constructWebhookEvent(payload, signer.webhooks.generateTestHeaderString({ payload, secret: SECRET }))).toEqual({
      id: "evt_1",
      type: "other",
      stripeType: "charge.refunded",
    });
  });
});
