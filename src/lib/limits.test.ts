import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CreditCeilingError, RateLimitError, creditsUsedToday, enforceRateLimit, reserveCredits, settleCredits } from "./limits";
import { createFileStore } from "./store";

const freshStore = () => createFileStore(mkdtempSync(path.join(tmpdir(), "secondlook-")));

describe("daily credit ceiling", () => {
  afterEach(() => {
    delete process.env.MAX_DAILY_CREDITS;
  });

  it("refuses a reservation that would cross MAX_DAILY_CREDITS and leaves the counter untouched", async () => {
    process.env.MAX_DAILY_CREDITS = "100";
    const store = freshStore();
    const { day } = await reserveCredits(50, store);
    await settleCredits(day, 50, 50, store);
    await reserveCredits(50, store);
    await expect(reserveCredits(5, store)).rejects.toBeInstanceOf(CreditCeilingError);
    expect(await store.getNumber(`credits:${day}`)).toBe(100);
  });

  it("refunds failed generations", async () => {
    process.env.MAX_DAILY_CREDITS = "10";
    const store = freshStore();
    const { day } = await reserveCredits(10, store);
    await settleCredits(day, 10, 0, store);
    await expect(reserveCredits(10, store)).resolves.toMatchObject({ day });
  });

  it("blocks everything when the ceiling is zero", async () => {
    process.env.MAX_DAILY_CREDITS = "0";
    await expect(reserveCredits(5, freshStore())).rejects.toBeInstanceOf(CreditCeilingError);
  });

  it("reports usage", async () => {
    process.env.MAX_DAILY_CREDITS = "100";
    const store = freshStore();
    await reserveCredits(7, store);
    expect(await creditsUsedToday(store)).toBe(7);
  });
});

describe("rate limits", () => {
  it("allows 5 analyses per IP per hour and blocks the 6th with a retry hint", async () => {
    const store = freshStore();
    for (let i = 0; i < 5; i++) await enforceRateLimit("analyze", "1.2.3.4", store);
    const err = await enforceRateLimit("analyze", "1.2.3.4", store).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfterSeconds).toBeGreaterThan(0);
    await expect(enforceRateLimit("analyze", "5.6.7.8", store)).resolves.toBeUndefined();
  });

  it("allows 10 generations per IP per hour", async () => {
    const store = freshStore();
    for (let i = 0; i < 10; i++) await enforceRateLimit("generate", "1.2.3.4", store);
    await expect(enforceRateLimit("generate", "1.2.3.4", store)).rejects.toBeInstanceOf(RateLimitError);
  });
});
