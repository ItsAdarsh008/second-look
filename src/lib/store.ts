import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import { createUpstashClient, upstashConfigFromEnv, type UpstashClient } from "./clients/upstash";

/**
 * Storage behind one small interface so swapping backends is one file.
 * - Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_*) are set — use this in production.
 * - Otherwise documents on disk under .data/store (dev) and counters in memory.
 */
export interface Store {
  readonly kind: "redis" | "file";
  getJSON<T>(key: string, schema: z.ZodType<T>): Promise<T | null>;
  setJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  /** Atomically add `amount` to an integer counter; returns the new value. */
  incrBy(key: string, amount: number, ttlSeconds: number): Promise<number>;
  getNumber(key: string): Promise<number>;
  /** Sliding-window limiter. Records the hit only when allowed. */
  hit(key: string, limit: number, windowMs: number, now?: number): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }>;
}

/* ---------------------------------- redis ---------------------------------- */

class RedisStore implements Store {
  readonly kind = "redis" as const;
  constructor(private readonly redis: UpstashClient) {}

  async getJSON<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
    const raw = await this.redis.command(["GET", key]);
    if (typeof raw !== "string") return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  }

  async setJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const cmd = ["SET", key, JSON.stringify(value)];
    await this.redis.command(ttlSeconds ? [...cmd, "EX", ttlSeconds] : cmd);
  }

  async incrBy(key: string, amount: number, ttlSeconds: number): Promise<number> {
    const [value] = await this.redis.pipeline([
      ["INCRBY", key, Math.round(amount)],
      ["EXPIRE", key, ttlSeconds, "NX"],
    ]);
    return Number(value);
  }

  async getNumber(key: string): Promise<number> {
    const raw = await this.redis.command(["GET", key]);
    return raw === null ? 0 : Number(raw);
  }

  async hit(key: string, limit: number, windowMs: number, now = Date.now()) {
    const [, count, oldest] = await this.redis.pipeline([
      ["ZREMRANGEBYSCORE", key, 0, now - windowMs],
      ["ZCARD", key],
      ["ZRANGE", key, 0, 0, "WITHSCORES"],
    ]);
    const used = Number(count);
    if (used >= limit) {
      const oldestScore = Array.isArray(oldest) && oldest.length >= 2 ? Number(oldest[1]) : now;
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, oldestScore + windowMs - now) };
    }
    await this.redis.pipeline([
      ["ZADD", key, now, `${now}-${Math.random().toString(36).slice(2, 8)}`],
      ["PEXPIRE", key, windowMs],
    ]);
    return { allowed: true, remaining: limit - used - 1, retryAfterMs: 0 };
  }
}

/* ------------------------------ file + memory ------------------------------ */

const SAFE_KEY = /^[A-Za-z0-9:_-]+$/;

class FileStore implements Store {
  readonly kind = "file" as const;
  private readonly counters = new Map<string, { value: number; expiresAt: number }>();
  private readonly windows = new Map<string, number[]>();

  constructor(private readonly dir: string) {}

  private file(key: string): string {
    if (!SAFE_KEY.test(key)) throw new Error(`Unsafe store key: ${key}`);
    return path.join(this.dir, `${key.replace(/:/g, "__")}.json`);
  }

  async getJSON<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
    try {
      const parsed = schema.safeParse(JSON.parse(await readFile(this.file(key), "utf8")));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  async setJSON(key: string, value: unknown): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file(key), JSON.stringify(value, null, 2));
  }

  async incrBy(key: string, amount: number, ttlSeconds: number): Promise<number> {
    const now = Date.now();
    const current = this.counters.get(key);
    const base = current && current.expiresAt > now ? current : { value: 0, expiresAt: now + ttlSeconds * 1000 };
    base.value += Math.round(amount);
    this.counters.set(key, base);
    return base.value;
  }

  async getNumber(key: string): Promise<number> {
    const current = this.counters.get(key);
    return current && current.expiresAt > Date.now() ? current.value : 0;
  }

  async hit(key: string, limit: number, windowMs: number, now = Date.now()) {
    const recent = (this.windows.get(key) ?? []).filter((t) => t > now - windowMs);
    if (recent.length >= limit) {
      this.windows.set(key, recent);
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, recent[0] + windowMs - now) };
    }
    recent.push(now);
    this.windows.set(key, recent);
    return { allowed: true, remaining: limit - recent.length, retryAfterMs: 0 };
  }
}

/* --------------------------------- factory --------------------------------- */

const globalForStore = globalThis as unknown as { __secondLookStore?: Store };

export function getStore(): Store {
  if (globalForStore.__secondLookStore) return globalForStore.__secondLookStore;
  const upstash = upstashConfigFromEnv();
  const dir = process.env.VERCEL ? path.join("/tmp", "secondlook-store") : path.join(process.cwd(), ".data", "store");
  const store: Store = upstash ? new RedisStore(createUpstashClient(upstash)) : new FileStore(dir);
  globalForStore.__secondLookStore = store;
  return store;
}

/** For tests. */
export function createFileStore(dir: string): Store {
  return new FileStore(dir);
}

export const keys = {
  analysis: (id: string) => `analysis:${id}`,
  job: (id: string) => `job:${id}`,
  rateLimit: (kind: string, ip: string) => `rl:${kind}:${ip.replace(/[^A-Za-z0-9_-]/g, "_")}`,
  credits: (day: string) => `credits:${day}`,
};

export const ANALYSIS_TTL_SECONDS = 60 * 60 * 24 * 90;
export const JOB_TTL_SECONDS = 60 * 60 * 24 * 30;
