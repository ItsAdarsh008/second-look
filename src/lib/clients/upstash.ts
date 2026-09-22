import "server-only";
import { z } from "zod";

/** Minimal typed client for the Upstash Redis REST API (Vercel Marketplace "Redis"). */

export class UpstashError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "UpstashError";
    this.status = status;
  }
}

export type RedisValue = string | number | null;
export type RedisCommand = (string | number)[];

const ResultSchema = z.union([
  z.object({ result: z.unknown() }),
  z.object({ error: z.string() }),
]);

export interface UpstashConfig {
  url: string;
  token: string;
}

/** A pair only counts if both halves are set and non-blank, so credentials are never mixed across stores. */
function configPair(urlName: string, tokenName: string): UpstashConfig | null {
  const url = process.env[urlName]?.trim();
  const token = process.env[tokenName]?.trim();
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/**
 * Upstash sets `UPSTASH_REDIS_REST_*` directly; Vercel's marketplace integration sets
 * `KV_REST_API_*`. Either pair works, and whichever is complete wins.
 *
 * Checked pair by pair rather than variable by variable, and blank-tolerant, because both mistakes
 * are live hazards on Vercel: a variable left empty in the dashboard is `""`, not `undefined`, so
 * `??` would happily take it and shadow a working value — which is exactly what an abandoned
 * `UPSTASH_REDIS_REST_URL` did here after the integration arrived with its own `KV_REST_API_URL`.
 * Falling back per variable would be worse still: it could pair one store's URL with another's
 * token and fail at request time instead of at configuration time.
 */
export function upstashConfigFromEnv(): UpstashConfig | null {
  return configPair("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN") ?? configPair("KV_REST_API_URL", "KV_REST_API_TOKEN");
}

export function createUpstashClient(config: UpstashConfig) {
  async function post(path: string, body: unknown): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(`${config.url}${path}`, {
        method: "POST",
        headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new UpstashError(`Could not reach Redis: ${String(err)}`);
    }
    if (!res.ok) throw new UpstashError(`Redis REST returned HTTP ${res.status}`, res.status);
    return res.json();
  }

  function unwrap(raw: unknown): unknown {
    const parsed = ResultSchema.safeParse(raw);
    if (!parsed.success) throw new UpstashError("Unexpected Redis REST response");
    if ("error" in parsed.data) throw new UpstashError(parsed.data.error);
    return parsed.data.result;
  }

  return {
    async command(cmd: RedisCommand): Promise<unknown> {
      return unwrap(await post("", cmd));
    },
    async pipeline(cmds: RedisCommand[]): Promise<unknown[]> {
      const raw = await post("/pipeline", cmds);
      const arr = z.array(z.unknown()).safeParse(raw);
      if (!arr.success) throw new UpstashError("Unexpected Redis pipeline response");
      return arr.data.map(unwrap);
    },
  };
}

export type UpstashClient = ReturnType<typeof createUpstashClient>;
