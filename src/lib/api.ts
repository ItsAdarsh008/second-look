import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { AnalysisError } from "./analyze";
import { AnthropicClientError } from "./clients/anthropic";
import { BlobUploadError } from "./clients/blob";
import { GenerationError } from "./generate";
import { CreativeError } from "./clients/creative";
import { MagicHourError } from "./clients/magicHour";
import { CreditCeilingError, RateLimitError } from "./limits";
import { log } from "./logger";
import type { ApiErrorBody } from "./schema";

export function apiError(code: string, message: string, status: number, headers?: HeadersInit): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse<ApiErrorBody> }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiError("invalid_json", "Request body must be JSON.", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return { ok: false, response: apiError("invalid_request", `${where}${first?.message ?? "Invalid request."}`, 400) };
  }
  return { ok: true, data: parsed.data };
}

/** Map any thrown error to a typed response. Upstream bodies and stack traces never reach the client. */
export function errorResponse(err: unknown, context: string): NextResponse<ApiErrorBody> {
  if (err instanceof RateLimitError) {
    return apiError("rate_limited", err.message, 429, { "retry-after": String(err.retryAfterSeconds) });
  }
  if (err instanceof CreditCeilingError) return apiError("daily_credit_ceiling", err.message, 429);
  if (err instanceof AnalysisError) return apiError(err.code, err.message, err.status);
  if (err instanceof GenerationError) return apiError(err.code, err.message, err.status);
  if (err instanceof BlobUploadError) return apiError("upload_failed", err.message, 400);
  if (err instanceof CreativeError) return apiError("image_unavailable", err.message, 422);
  if (err instanceof MagicHourError) {
    const status =
      err.code === "insufficient_credits" ? 402 : err.code === "rate_limited" ? 429 : err.code === "timeout" ? 504 : err.code === "not_configured" ? 503 : 502;
    const code = err.code === "insufficient_credits" ? "magic_hour_out_of_credits" : `magic_hour_${err.code}`;
    log.error("generation.failed", { context, code: err.code, status: err.status });
    return apiError(code, err.userMessage, status);
  }
  if (err instanceof AnthropicClientError) return apiError("upstream_unavailable", "The analysis model is unavailable.", 503);
  log.error("request.rejected", { context, reason: err instanceof Error ? err.name : "unknown" });
  return apiError("internal_error", "Something went wrong on our side.", 500);
}
