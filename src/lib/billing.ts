import "server-only";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { stripeConfigured, type CheckoutSession } from "./clients/stripe";
import { log } from "./logger";
import {
  FREE_REVIEWS,
  PackIdSchema,
  RENDERS_PER_REVIEW,
  WALLET_ALPHABET,
  WALLET_ID_LENGTH,
  WalletIdSchema,
  formatWalletCode,
  getPack,
} from "./pricing";
import { ANALYSIS_TTL_SECONDS, JOB_TTL_SECONDS, getStore, type Store } from "./store";

/**
 * Who may run a review, and what it costs them.
 *
 * There are no accounts. A wallet is a random id in an httpOnly cookie; paid reviews are a counter
 * against it, and the id doubles as the recovery code for another browser. Every charge is taken
 * before the work starts and refunded if the work fails, so a crash can't hand out free reviews and
 * a failed review never costs the buyer anything.
 *
 * Billing is on only when STRIPE_SECRET_KEY is set. Without it every charge is "unmetered" and the
 * app behaves as it did before payments existed.
 */

/** Free reviews per network (IP address) per 30 days, so clearing cookies doesn't mint free reviews. */
export const FREE_PER_NETWORK = 2;
const FREE_NETWORK_WINDOW_SECONDS = 60 * 60 * 24 * 30;
/** Reviews never expire. Redis keys need some TTL; ten years from the first purchase will do. */
const WALLET_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;
const FULFILLED_TTL_SECONDS = 60 * 60 * 24 * 365;

export function billingEnabled(): boolean {
  return stripeConfigured();
}

export class PaymentRequiredError extends Error {
  readonly reason: "review" | "render";
  constructor(reason: PaymentRequiredError["reason"]) {
    super(
      reason === "review"
        ? "You've used your free review. Buy a pack of reviews to run another."
        : "This review's included alternative is used. Another one costs one review.",
    );
    this.name = "PaymentRequiredError";
    this.reason = reason;
  }
}

export class BillingError extends Error {
  readonly code: "shared_storage_required" | "wallet_not_found" | "invalid_purchase";
  readonly status: number;
  constructor(code: BillingError["code"], message: string, status: number) {
    super(message);
    this.name = "BillingError";
    this.code = code;
    this.status = status;
  }
}

const newWalletId = customAlphabet(WALLET_ALPHABET, WALLET_ID_LENGTH);
export function createWalletId(): string {
  return newWalletId();
}

export const billingKeys = {
  reviews: (wallet: string) => `wallet:${wallet}:reviews`,
  purchased: (wallet: string) => `wallet:${wallet}:purchased`,
  freeUsed: (wallet: string) => `wallet:${wallet}:free`,
  freeNetwork: (ip: string) => `free-net:${ip.replace(/[^A-Za-z0-9_-]/g, "_")}`,
  renders: (analysisId: string) => `renders:${analysisId}`,
  renderCharge: (jobId: string) => `render-charge:${jobId}`,
  renderRefunded: (jobId: string) => `render-refunded:${jobId}`,
  fulfilled: (sessionId: string) => `fulfilled:${sessionId}`,
};

/** Counters on one serverless instance's disk aren't a ledger. */
function requireSharedStore(store: Store): void {
  if (process.env.VERCEL && store.kind !== "redis") {
    throw new BillingError("shared_storage_required", "Payments need shared storage (Upstash Redis) on this deployment.", 503);
  }
}

/** Take one from a counter if it has one to give. Never leaves it below zero. */
async function take(store: Store, key: string, ttlSeconds: number): Promise<boolean> {
  if ((await store.getNumber(key)) <= 0) return false;
  if ((await store.incrBy(key, -1, ttlSeconds)) >= 0) return true;
  await store.incrBy(key, 1, ttlSeconds);
  return false;
}

/* --------------------------------- reviews --------------------------------- */

export const ReviewChargeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("free"), wallet: z.string(), ip: z.string() }),
  z.object({ kind: z.literal("paid"), wallet: z.string() }),
  z.object({ kind: z.literal("unmetered") }),
]);
export type ReviewCharge = z.infer<typeof ReviewChargeSchema>;

/** Charge one review: the free one first, then a paid one. Throws PaymentRequiredError when there's neither. */
export async function chargeReview(wallet: string | null, ip: string, store: Store = getStore()): Promise<ReviewCharge> {
  if (!billingEnabled()) return { kind: "unmetered" };
  requireSharedStore(store);
  if (!wallet) throw new PaymentRequiredError("review");

  const freeKey = billingKeys.freeUsed(wallet);
  const networkKey = billingKeys.freeNetwork(ip);
  if ((await store.getNumber(freeKey)) < FREE_REVIEWS) {
    const used = await store.incrBy(freeKey, 1, WALLET_TTL_SECONDS);
    if (used <= FREE_REVIEWS) {
      if ((await store.incrBy(networkKey, 1, FREE_NETWORK_WINDOW_SECONDS)) <= FREE_PER_NETWORK) {
        log.info("billing.charged", { item: "review", kind: "free" });
        return { kind: "free", wallet, ip };
      }
      await store.incrBy(networkKey, -1, FREE_NETWORK_WINDOW_SECONDS);
    }
    await store.incrBy(freeKey, -1, WALLET_TTL_SECONDS);
  }

  if (await take(store, billingKeys.reviews(wallet), WALLET_TTL_SECONDS)) {
    log.info("billing.charged", { item: "review", kind: "paid" });
    return { kind: "paid", wallet };
  }
  log.info("billing.payment_required", { item: "review" });
  throw new PaymentRequiredError("review");
}

export async function refundReview(charge: ReviewCharge, store: Store = getStore()): Promise<void> {
  if (charge.kind === "free") {
    await store.incrBy(billingKeys.freeUsed(charge.wallet), -1, WALLET_TTL_SECONDS);
    await store.incrBy(billingKeys.freeNetwork(charge.ip), -1, FREE_NETWORK_WINDOW_SECONDS);
  } else if (charge.kind === "paid") {
    await store.incrBy(billingKeys.reviews(charge.wallet), 1, WALLET_TTL_SECONDS);
  } else {
    return;
  }
  log.info("billing.refunded", { item: "review", kind: charge.kind });
}

/** A finished review comes with its alternatives. They belong to the analysis, so a shared report link carries them. */
export async function grantRenders(analysisId: string, charge: ReviewCharge, store: Store = getStore()): Promise<void> {
  if (charge.kind === "unmetered") return;
  await store.incrBy(billingKeys.renders(analysisId), RENDERS_PER_REVIEW, ANALYSIS_TTL_SECONDS);
}

/* --------------------------------- renders --------------------------------- */

export const RenderChargeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("included"), analysisId: z.string() }),
  z.object({ kind: z.literal("paid"), wallet: z.string() }),
  z.object({ kind: z.literal("unmetered") }),
]);
export type RenderCharge = z.infer<typeof RenderChargeSchema>;

/** Charge one Magic Hour render: the review's included one first, then a review from the wallet. */
export async function chargeRender(analysisId: string, wallet: string | null, store: Store = getStore()): Promise<RenderCharge> {
  if (!billingEnabled()) return { kind: "unmetered" };
  requireSharedStore(store);
  if (await take(store, billingKeys.renders(analysisId), ANALYSIS_TTL_SECONDS)) {
    log.info("billing.charged", { item: "render", kind: "included" });
    return { kind: "included", analysisId };
  }
  if (wallet && (await take(store, billingKeys.reviews(wallet), WALLET_TTL_SECONDS))) {
    log.info("billing.charged", { item: "render", kind: "paid" });
    return { kind: "paid", wallet };
  }
  log.info("billing.payment_required", { item: "render" });
  throw new PaymentRequiredError("render");
}

export async function refundRender(charge: RenderCharge, store: Store = getStore()): Promise<void> {
  if (charge.kind === "included") await store.incrBy(billingKeys.renders(charge.analysisId), 1, ANALYSIS_TTL_SECONDS);
  else if (charge.kind === "paid") await store.incrBy(billingKeys.reviews(charge.wallet), 1, WALLET_TTL_SECONDS);
  else return;
  log.info("billing.refunded", { item: "render", kind: charge.kind });
}

/** Remember what a submitted render cost, so a render that fails later can be refunded. */
export async function recordRenderCharge(jobId: string, charge: RenderCharge, store: Store = getStore()): Promise<void> {
  if (charge.kind === "unmetered") return;
  await store.setJSON(billingKeys.renderCharge(jobId), charge, JOB_TTL_SECONDS);
}

/** Refund a render Magic Hour failed or cancelled. Safe to call on every poll: it pays out once. */
export async function refundFailedRender(jobId: string, store: Store = getStore()): Promise<void> {
  const charge = await store.getJSON(billingKeys.renderCharge(jobId), RenderChargeSchema);
  if (!charge) return;
  if ((await store.incrBy(billingKeys.renderRefunded(jobId), 1, JOB_TTL_SECONDS)) !== 1) return;
  await refundRender(charge, store);
}

/* --------------------------------- wallets --------------------------------- */

export interface WalletSummary {
  /** Free reviews this wallet can still run from this network. */
  free: number;
  /** Paid reviews left. */
  reviews: number;
  /** The recovery code, once the wallet holds something worth recovering. */
  code: string | null;
  /** Included renders left on the analysis asked about, if one was. */
  renders: number | null;
}

export async function walletSummary(wallet: string, ip: string, analysisId: string | null = null, store: Store = getStore()): Promise<WalletSummary> {
  const [freeUsed, network, reviews, purchased, renders] = await Promise.all([
    store.getNumber(billingKeys.freeUsed(wallet)),
    store.getNumber(billingKeys.freeNetwork(ip)),
    store.getNumber(billingKeys.reviews(wallet)),
    store.getNumber(billingKeys.purchased(wallet)),
    analysisId ? store.getNumber(billingKeys.renders(analysisId)) : Promise.resolve(0),
  ]);
  return {
    free: network < FREE_PER_NETWORK ? Math.max(0, FREE_REVIEWS - freeUsed) : 0,
    reviews: Math.max(0, reviews),
    code: purchased > 0 ? formatWalletCode(wallet) : null,
    renders: analysisId ? Math.max(0, renders) : null,
  };
}

/** Only a wallet that has bought something can be restored: there is nothing in an unpaid one to carry over. */
export async function walletHasPurchases(wallet: string, store: Store = getStore()): Promise<boolean> {
  return (await store.getNumber(billingKeys.purchased(wallet))) > 0;
}

/* -------------------------------- purchases -------------------------------- */

const PurchaseMetadataSchema = z.object({ wallet: WalletIdSchema, pack: PackIdSchema });

export function purchaseMetadata(wallet: string, packId: z.infer<typeof PackIdSchema>): Record<string, string> {
  return { wallet, pack: packId, reviews: String(getPack(packId).reviews) };
}

export type FulfillOutcome =
  | { status: "fulfilled" | "already_fulfilled"; wallet: string; reviews: number }
  | { status: "pending" | "not_paid"; wallet: string; reviews: number };

/**
 * Credit a completed Checkout Session to its wallet, exactly once. Called by the webhook (the source
 * of truth) and by the return page (so reviews appear without waiting for it); whichever arrives
 * second finds the session already fulfilled.
 */
export async function fulfillCheckout(session: CheckoutSession, store: Store = getStore()): Promise<FulfillOutcome> {
  const meta = PurchaseMetadataSchema.safeParse(session.metadata ?? {});
  if (!meta.success || session.client_reference_id !== meta.data.wallet) {
    throw new BillingError("invalid_purchase", "That checkout isn't a Second Look purchase.", 400);
  }
  requireSharedStore(store);
  const { wallet } = meta.data;
  const { reviews } = getPack(meta.data.pack);

  // "unpaid" on a complete session is a bank debit or similar still settling:
  // checkout.session.async_payment_succeeded fulfills it later.
  if (session.payment_status === "unpaid") return { status: session.status === "expired" ? "not_paid" : "pending", wallet, reviews };

  const claim = billingKeys.fulfilled(session.id);
  if ((await store.incrBy(claim, 1, FULFILLED_TTL_SECONDS)) > 1) return { status: "already_fulfilled", wallet, reviews };
  try {
    // `purchased` first: if crediting the reviews fails, the retry repeats only a harmless marker.
    await store.incrBy(billingKeys.purchased(wallet), reviews, WALLET_TTL_SECONDS);
    await store.incrBy(billingKeys.reviews(wallet), reviews, WALLET_TTL_SECONDS);
  } catch (err) {
    await store.incrBy(claim, -1, FULFILLED_TTL_SECONDS);
    throw err;
  }
  log.info("billing.fulfilled", { pack: meta.data.pack, reviews, amount: session.amount_total, currency: session.currency });
  return { status: "fulfilled", wallet, reviews };
}
