import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upstashConfigFromEnv } from "./upstash";

const KEYS = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"] as const;

describe("upstashConfigFromEnv", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    for (const k of KEYS) delete process.env[k];
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("returns null when nothing is set", () => {
    expect(upstashConfigFromEnv()).toBeNull();
  });

  it("uses the UPSTASH pair, trimming a trailing slash", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://a.upstash.io/";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token-a";
    expect(upstashConfigFromEnv()).toEqual({ url: "https://a.upstash.io", token: "token-a" });
  });

  it("uses the KV pair when only the integration's variables are set", () => {
    process.env.KV_REST_API_URL = "https://b.upstash.io";
    process.env.KV_REST_API_TOKEN = "token-b";
    expect(upstashConfigFromEnv()).toEqual({ url: "https://b.upstash.io", token: "token-b" });
  });

  // The outage this guards: abandoned UPSTASH_* variables left blank in the Vercel dashboard sat in
  // front of a working KV_REST_API_* pair. `??` takes "" because it is not nullish, so the config
  // came back null and the app silently fell back to the on-disk store.
  it("ignores blank variables and falls through to the pair that is actually set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.UPSTASH_REDIS_REST_TOKEN = "   ";
    process.env.KV_REST_API_URL = "https://b.upstash.io";
    process.env.KV_REST_API_TOKEN = "token-b";
    expect(upstashConfigFromEnv()).toEqual({ url: "https://b.upstash.io", token: "token-b" });
  });

  it("never pairs one store's url with another's token", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://a.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "";
    process.env.KV_REST_API_URL = "https://b.upstash.io";
    process.env.KV_REST_API_TOKEN = "token-b";
    expect(upstashConfigFromEnv()).toEqual({ url: "https://b.upstash.io", token: "token-b" });
  });

  it("returns null when neither pair is complete", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://a.upstash.io";
    process.env.KV_REST_API_TOKEN = "token-b";
    expect(upstashConfigFromEnv()).toBeNull();
  });
});
