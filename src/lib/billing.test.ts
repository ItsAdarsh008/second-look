import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BillingError,
  FREE_PER_NETWORK,
  PaymentRequiredError,
  chargeRender,
  chargeReview,
  createWalletId,
  fulfillCheckout,
  grantRenders,
  purchaseMetadata,
  recordRenderCharge,
  refundFailedRender,
  refundRender,
  refundReview,
  walletHasPurchases,
  walletSummary,
} from "./billing";
import type { CheckoutSession } from "./clients/stripe";
import { PACKS, WalletIdSchema, formatWalletCode, normalizeWalletCode, pricePerReview } from "./pricing";
import { createFileStore } from "./store";

const freshStore = () => createFileStore(mkdtempSync(path.join(tmpdir(), "secondlook-billing-")));

function session(wallet: string, overrides: Partial<CheckoutSession> = {}): CheckoutSession {
  return {
    id: `cs_test_${Math.random().toString(36).slice(2, 12)}`,
    status: "complete",
    payment_status: "paid",
    client_reference_id: wallet,
    metadata: purchaseMetadata(wallet, "starter"),
    amount_total: 1500,
    currency: "usd",
    url: null,
    ...overrides,
  };
}

describe("billing", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "rk_test_placeholder";
  });
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("charges nothing when payments aren't configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const store = freshStore();
    for (let i = 0; i < 5; i++) await expect(chargeReview(null, "1.1.1.1", store)).resolves.toEqual({ kind: "unmetered" });
    await expect(chargeRender("a1", null, store)).resolves.toEqual({ kind: "unmetered" });
  });

  it("gives one free review, then asks for payment", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    await expect(chargeReview(wallet, "1.1.1.1", store)).resolves.toMatchObject({ kind: "free" });
    await expect(chargeReview(wallet, "1.1.1.1", store)).rejects.toBeInstanceOf(PaymentRequiredError);
    expect(await walletSummary(wallet, "1.1.1.1", null, store)).toMatchObject({ free: 0, reviews: 0 });
  });

  it("refunds a failed free review", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    const charge = await chargeReview(wallet, "1.1.1.1", store);
    await refundReview(charge, store);
    expect(await walletSummary(wallet, "1.1.1.1", null, store)).toMatchObject({ free: 1 });
    await expect(chargeReview(wallet, "1.1.1.1", store)).resolves.toMatchObject({ kind: "free" });
  });

  it("caps free reviews per network, without using up the blocked wallet's", async () => {
    const store = freshStore();
    for (let i = 0; i < FREE_PER_NETWORK; i++) await expect(chargeReview(createWalletId(), "2.2.2.2", store)).resolves.toMatchObject({ kind: "free" });
    const late = createWalletId();
    await expect(chargeReview(late, "2.2.2.2", store)).rejects.toBeInstanceOf(PaymentRequiredError);
    expect(await walletSummary(late, "2.2.2.2", null, store)).toMatchObject({ free: 0 });
    // The same wallet on another network still has its free review.
    await expect(chargeReview(late, "3.3.3.3", store)).resolves.toMatchObject({ kind: "free" });
  });

  it("requires a wallet", async () => {
    await expect(chargeReview(null, "1.1.1.1", freshStore())).rejects.toBeInstanceOf(PaymentRequiredError);
  });

  it("spends paid reviews after the free one, and refunds them", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    await fulfillCheckout(session(wallet), store);
    expect(await walletSummary(wallet, "1.1.1.1", null, store)).toMatchObject({ free: 1, reviews: 10 });

    await expect(chargeReview(wallet, "1.1.1.1", store)).resolves.toMatchObject({ kind: "free" });
    const paid = await chargeReview(wallet, "1.1.1.1", store);
    expect(paid).toEqual({ kind: "paid", wallet });
    expect((await walletSummary(wallet, "1.1.1.1", null, store)).reviews).toBe(9);
    await refundReview(paid, store);
    expect((await walletSummary(wallet, "1.1.1.1", null, store)).reviews).toBe(10);
  });

  it("never spends the same review twice", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    await chargeReview(wallet, "1.1.1.1", store); // the free one
    await fulfillCheckout(session(wallet, { metadata: { ...purchaseMetadata(wallet, "starter") } }), store);
    for (let i = 0; i < 9; i++) await chargeReview(wallet, "1.1.1.1", store);
    const results = await Promise.allSettled([chargeReview(wallet, "1.1.1.1", store), chargeReview(wallet, "1.1.1.1", store)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await walletSummary(wallet, "1.1.1.1", null, store)).reviews).toBe(0);
  });
});

describe("checkout fulfillment", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "rk_test_placeholder";
  });
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("credits a paid session exactly once, whether the webhook or the return page gets there first", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    const paid = session(wallet);
    const [a, b] = await Promise.all([fulfillCheckout(paid, store), fulfillCheckout(paid, store)]);
    expect([a.status, b.status].sort()).toEqual(["already_fulfilled", "fulfilled"]);
    expect((await walletSummary(wallet, "1.1.1.1", null, store)).reviews).toBe(10);
  });

  it("credits the pack's own count, not the metadata's", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    await fulfillCheckout(session(wallet, { metadata: { wallet, pack: "team", reviews: "5000" } }), store);
    expect((await walletSummary(wallet, "1.1.1.1", null, store)).reviews).toBe(50);
  });

  it("waits for a delayed payment method instead of crediting it", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    const pending = session(wallet, { payment_status: "unpaid" });
    await expect(fulfillCheckout(pending, store)).resolves.toMatchObject({ status: "pending" });
    expect((await walletSummary(wallet, "1.1.1.1", null, store)).reviews).toBe(0);
    // checkout.session.async_payment_succeeded carries the same session, now paid.
    await expect(fulfillCheckout({ ...pending, payment_status: "paid" }, store)).resolves.toMatchObject({ status: "fulfilled" });
    expect((await walletSummary(wallet, "1.1.1.1", null, store)).reviews).toBe(10);
  });

  it("refuses sessions that aren't Second Look purchases", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    await expect(fulfillCheckout(session(wallet, { metadata: {} }), store)).rejects.toBeInstanceOf(BillingError);
    await expect(fulfillCheckout(session(wallet, { client_reference_id: createWalletId() }), store)).rejects.toBeInstanceOf(BillingError);
    await expect(fulfillCheckout(session(wallet, { metadata: { wallet, pack: "enterprise" } }), store)).rejects.toBeInstanceOf(BillingError);
  });

  it("shows the recovery code only once there's something to recover", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    expect((await walletSummary(wallet, "1.1.1.1", null, store)).code).toBeNull();
    expect(await walletHasPurchases(wallet, store)).toBe(false);
    await fulfillCheckout(session(wallet), store);
    expect((await walletSummary(wallet, "1.1.1.1", null, store)).code).toBe(formatWalletCode(wallet));
    expect(await walletHasPurchases(wallet, store)).toBe(true);
  });
});

describe("renders", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "rk_test_placeholder";
  });
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("includes one alternative per review, then charges a review", async () => {
    const store = freshStore();
    const wallet = createWalletId();
    const review = await chargeReview(wallet, "1.1.1.1", store);
    await grantRenders("an1", review, store);
    expect((await walletSummary(wallet, "1.1.1.1", "an1", store)).renders).toBe(1);

    await expect(chargeRender("an1", wallet, store)).resolves.toEqual({ kind: "included", analysisId: "an1" });
    await expect(chargeRender("an1", wallet, store)).rejects.toMatchObject({ reason: "render" });

    await fulfillCheckout(session(wallet), store);
    await expect(chargeRender("an1", wallet, store)).resolves.toEqual({ kind: "paid", wallet });
    expect((await walletSummary(wallet, "1.1.1.1", "an1", store)).reviews).toBe(9);
  });

  it("lets anyone with a shared report use its included alternative, but not their own balance", async () => {
    const store = freshStore();
    await grantRenders("an2", { kind: "free", wallet: createWalletId(), ip: "1.1.1.1" }, store);
    await expect(chargeRender("an2", null, store)).resolves.toMatchObject({ kind: "included" });
    await expect(chargeRender("an2", null, store)).rejects.toBeInstanceOf(PaymentRequiredError);
  });

  it("refunds a render that fails after submission, once", async () => {
    const store = freshStore();
    await grantRenders("an3", { kind: "paid", wallet: createWalletId() }, store);
    const charge = await chargeRender("an3", null, store);
    await recordRenderCharge("job1", charge, store);
    await Promise.all([refundFailedRender("job1", store), refundFailedRender("job1", store), refundFailedRender("job1", store)]);
    expect(await store.getNumber("renders:an3")).toBe(1);
  });

  it("refunds a render that fails to start", async () => {
    const store = freshStore();
    await grantRenders("an4", { kind: "paid", wallet: createWalletId() }, store);
    await refundRender(await chargeRender("an4", null, store), store);
    await expect(chargeRender("an4", null, store)).resolves.toMatchObject({ kind: "included" });
  });

  it("grants nothing for an unmetered review", async () => {
    const store = freshStore();
    await grantRenders("an5", { kind: "unmetered" }, store);
    expect(await store.getNumber("renders:an5")).toBe(0);
  });
});

describe("pricing", () => {
  it("makes recovery codes that survive being retyped", () => {
    const id = createWalletId();
    expect(WalletIdSchema.safeParse(id).success).toBe(true);
    const code = formatWalletCode(id);
    expect(code).toMatch(/^[0-9A-Z]{5}(-[0-9A-Z]{5}){3}$/);
    expect(normalizeWalletCode(` ${code.toLowerCase()} `)).toBe(id);
    expect(normalizeWalletCode("OIL00-")).toBe("01100");
  });

  it("keeps every pack above cost and cheaper per review as it grows", () => {
    // About $0.25 of Claude usage and a render per review, plus Stripe's 2.9% + $0.30.
    for (const pack of PACKS) {
      const net = pack.priceCents * (1 - 0.029) - 30;
      expect(net / pack.reviews).toBeGreaterThan(50);
    }
    const perReview = PACKS.map((p) => p.priceCents / p.reviews);
    expect([...perReview].sort((a, b) => b - a)).toEqual(perReview);
    expect(pricePerReview(PACKS[0])).toBe("$1.50");
  });
});
