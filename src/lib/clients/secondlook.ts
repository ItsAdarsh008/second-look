import { z } from "zod";
import { AnalyzeStreamEventSchema, type AnalyzeStreamEvent } from "../analyze-stream";
import type { PackId } from "../pricing";
import {
  AnalysisResultSchema,
  ApiErrorBodySchema,
  EditJobSchema,
  type AnalysisResult,
  type CampaignInput,
  type EditJob,
  type MagicHourModel,
  type MagicHourResolution,
} from "../schema";

/** Typed browser client for this app's own API. Components never call fetch directly. */

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

async function readError(res: Response): Promise<ApiRequestError> {
  try {
    const body = ApiErrorBodySchema.safeParse(await res.json());
    if (body.success) return new ApiRequestError(body.data.error.code, body.data.error.message, res.status);
  } catch {
    /* fall through */
  }
  return new ApiRequestError("http_error", `Request failed (HTTP ${res.status}).`, res.status);
}

async function send<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiRequestError("network", "Couldn't reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) throw await readError(res);
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) throw new ApiRequestError("invalid_response", "The server sent an unexpected response.", res.status);
  return parsed.data;
}

/** Streams analysis stages; resolves with the final result. */
export async function analyzeWithProgress(
  input: CampaignInput,
  onEvent: (event: AnalyzeStreamEvent) => void,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/x-ndjson" },
      body: JSON.stringify(input),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiRequestError("network", "Couldn't reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok || !res.body) throw await readError(res);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let result: AnalysisResult | null = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += value;
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of done ? lines.filter(Boolean) : lines) {
      if (!line.trim()) continue;
      const parsed = AnalyzeStreamEventSchema.safeParse(JSON.parse(line));
      if (!parsed.success) continue;
      const event = parsed.data;
      if (event.stage === "error") throw new ApiRequestError(event.error.code, event.error.message, 200);
      if (event.stage === "complete") result = event.result;
      onEvent(event);
    }
    if (done) break;
  }

  if (!result) throw new ApiRequestError("incomplete", "The analysis stopped before finishing. Try again.", 200);
  return result;
}

export async function uploadLocal(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { url } = await send("/api/upload", z.object({ url: z.string() }), { method: "POST", body: form });
  return url;
}

export async function uploadToBlob(file: File): Promise<string> {
  const { upload } = await import("@vercel/blob/client");
  try {
    const blob = await upload(file.name || "creative", file, { access: "public", handleUploadUrl: "/api/upload" });
    return blob.url;
  } catch (err) {
    throw new ApiRequestError("upload_failed", err instanceof Error ? err.message : "Upload failed.", 0);
  }
}

export const GenerateResponseSchema = z.object({
  jobId: z.string(),
  magicHourProjectId: z.string(),
  prompt: z.string(),
  creditsCharged: z.number(),
  requestBody: z.record(z.string(), z.unknown()),
  job: EditJobSchema,
});
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

export interface GenerateParams {
  analysisId: string;
  findingIds?: string[];
  model: MagicHourModel;
  resolution: MagicHourResolution;
  imageCount: 1 | 4;
  promptOverride?: string;
}

export function startGeneration(params: GenerateParams): Promise<GenerateResponse> {
  return send("/api/generate", GenerateResponseSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
}

export function pollGeneration(jobId: string): Promise<EditJob> {
  return send(`/api/generate/${encodeURIComponent(jobId)}`, EditJobSchema, { cache: "no-store" });
}

export function fetchAnalysis(id: string): Promise<AnalysisResult> {
  return send(`/api/analysis/${encodeURIComponent(id)}`, AnalysisResultSchema);
}

/* --------------------------------- billing --------------------------------- */

export const WalletSchema = z.object({
  free: z.number().int().min(0),
  reviews: z.number().int().min(0),
  code: z.string().nullable(),
  renders: z.number().int().min(0).nullable(),
});
export type Wallet = z.infer<typeof WalletSchema>;

/** The visitor's allowance. With `analysisId`, also the included renders left on that review. */
export function fetchWallet(analysisId?: string): Promise<Wallet> {
  const query = analysisId ? `?analysis=${encodeURIComponent(analysisId)}` : "";
  return send(`/api/wallet${query}`, WalletSchema, { cache: "no-store" });
}

export function restoreWallet(code: string): Promise<Wallet> {
  return send("/api/wallet/restore", WalletSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

/** Resolves with the Stripe Checkout URL to send the buyer to. */
export function startCheckout(pack: PackId): Promise<{ url: string }> {
  return send("/api/checkout", z.object({ url: z.url() }), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pack }),
  });
}

export const CheckoutConfirmationSchema = z.object({
  status: z.enum(["fulfilled", "pending", "not_paid"]),
  reviews: z.number().int().min(0),
});
export type CheckoutConfirmation = z.infer<typeof CheckoutConfirmationSchema>;

export function confirmCheckout(sessionId: string): Promise<CheckoutConfirmation> {
  return send("/api/checkout/confirm", CheckoutConfirmationSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}
