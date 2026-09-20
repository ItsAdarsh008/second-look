import "server-only";
import { log } from "./logger";
import { getStore, keys, type Store } from "./store";

export const LIMITS = {
  analyze: { limit: 5, windowMs: 60 * 60 * 1000 },
  generate: { limit: 10, windowMs: 60 * 60 * 1000 },
  upload: { limit: 30, windowMs: 60 * 60 * 1000 },
  checkout: { limit: 20, windowMs: 60 * 60 * 1000 },
  restore: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;

const NOUNS: Record<LimitKind, string> = {
  analyze: "analyses",
  generate: "generations",
  upload: "uploads",
  checkout: "checkouts",
  restore: "restore attempts",
};

export type LimitKind = keyof typeof LIMITS;

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "local";
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  readonly kind: LimitKind;
  constructor(kind: LimitKind, retryAfterMs: number) {
    const { limit } = LIMITS[kind];
    super(`You've reached ${limit} ${NOUNS[kind]} this hour. Try again in ${Math.max(1, Math.ceil(retryAfterMs / 60_000))} min.`);
    this.name = "RateLimitError";
    this.kind = kind;
    this.retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  }
}

export async function enforceRateLimit(kind: LimitKind, ip: string, store: Store = getStore()): Promise<void> {
  const { limit, windowMs } = LIMITS[kind];
  const result = await store.hit(keys.rateLimit(kind, ip), limit, windowMs);
  if (!result.allowed) {
    log.warn("ratelimit.blocked", { kind });
    throw new RateLimitError(kind, result.retryAfterMs);
  }
}

/* ------------------------------ credit ceiling ------------------------------ */

export class CreditCeilingError extends Error {
  constructor() {
    super("Today's generation budget for this public demo is used up. It resets at midnight UTC.");
    this.name = "CreditCeilingError";
  }
}

export function dailyCreditCeiling(): number {
  const raw = Number(process.env.MAX_DAILY_CREDITS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 200;
}

function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const DAY_SECONDS = 60 * 60 * 26;

/** Reserve an estimated charge against today's global ceiling, or throw. */
export async function reserveCredits(estimate: number, store: Store = getStore(), now = new Date()): Promise<{ day: string }> {
  const day = today(now);
  const used = await store.incrBy(keys.credits(day), estimate, DAY_SECONDS);
  if (used > dailyCreditCeiling()) {
    await store.incrBy(keys.credits(day), -estimate, DAY_SECONDS);
    log.warn("credits.ceiling", { day, estimate, ceiling: dailyCreditCeiling() });
    throw new CreditCeilingError();
  }
  return { day };
}

/** Replace a reservation with the real charge (or refund it with actual = 0). */
export async function settleCredits(day: string, estimate: number, actual: number, store: Store = getStore()): Promise<void> {
  if (actual !== estimate) await store.incrBy(keys.credits(day), actual - estimate, DAY_SECONDS);
}

export async function creditsUsedToday(store: Store = getStore()): Promise<number> {
  return store.getNumber(keys.credits(today()));
}
