import "server-only";
import { z } from "zod";
import {
  MODEL_CREDITS_PER_IMAGE,
  buildEditRequestBody,
  estimateCredits,
  type EditImageParams,
  type EditImageRequestBody,
} from "../magic-hour-shared";
import { EditJobStatusSchema } from "../schema";

/**
 * Typed Magic Hour client — raw fetch, Zod-validated responses.
 * Reference: https://docs.magichour.ai/api-reference
 */

export const MAGIC_HOUR_BASE_URL = "https://api.magichour.ai";

export type MagicHourErrorCode =
  | "not_configured"
  | "unauthorized"
  | "insufficient_credits"
  | "subscription_required"
  | "plan_upgrade_required"
  | "rate_limited"
  | "invalid_request"
  | "not_found"
  | "unprocessable"
  | "server_error"
  | "network"
  | "invalid_response"
  | "render_failed"
  | "canceled"
  | "timeout";

export class MagicHourError extends Error {
  readonly status: number | null;
  readonly code: MagicHourErrorCode;
  /** Raw upstream body, for server logs only — never return it to a client. */
  readonly body: unknown;

  constructor(code: MagicHourErrorCode, message: string, status: number | null = null, body: unknown = null) {
    super(message);
    this.name = "MagicHourError";
    this.code = code;
    this.status = status;
    this.body = body;
  }

  /** Copy that is safe and useful to show an end user. */
  get userMessage(): string {
    switch (this.code) {
      case "insufficient_credits":
        return "The Magic Hour account behind this demo is out of credits. Generation is paused until it's topped up.";
      case "subscription_required":
      case "plan_upgrade_required":
        return "This Magic Hour model isn't available on the demo's current plan. Pick a different model.";
      case "rate_limited":
        return "Magic Hour is rate limiting requests. Wait a moment and try again.";
      case "unauthorized":
        // Separate from "not configured": the key is present, Magic Hour just refused it. Saying
        // it is missing sends whoever is debugging to look for a variable that is already there.
        return "Magic Hour rejected this deployment's API key.";
      case "not_configured":
        return "Image generation isn't configured on this deployment.";
      case "timeout":
        return "Magic Hour is taking longer than usual. The job may still finish — check again shortly.";
      case "render_failed":
        return "Magic Hour couldn't render this edit. Try another model or amend the prompt.";
      case "canceled":
        return "The generation was canceled.";
      case "invalid_request":
      case "unprocessable":
        return "Magic Hour rejected the request. Try a shorter prompt or a different model.";
      default:
        return "Magic Hour is unavailable right now. Try again shortly.";
    }
  }
}

/* ------------------------------ response schemas ------------------------------ */

const UploadUrlsResponseSchema = z.object({
  items: z
    .array(z.object({ upload_url: z.string().url(), file_path: z.string().min(1), expires_at: z.string() }))
    .min(1),
});

const EditResponseSchema = z.object({
  id: z.string().min(1),
  credits_charged: z.number().int().nonnegative(),
});

const ImageProjectSchema = z.object({
  id: z.string(),
  status: EditJobStatusSchema,
  credits_charged: z.number().int().nonnegative().catch(0),
  downloads: z
    .array(z.object({ url: z.string().url(), expires_at: z.string() }))
    .nullish()
    .transform((d) => d ?? []),
  error: z
    .object({ message: z.string(), code: z.string() })
    .nullish()
    .transform((e) => e ?? null),
});

const ErrorBodySchema = z
  .object({ message: z.string().optional(), code: z.string().optional(), error: z.unknown().optional() })
  .passthrough();

/* ---------------------------------- types ---------------------------------- */

export type UploadExtension = "png" | "jpg" | "jpeg" | "webp";

export interface UploadUrl {
  uploadUrl: string;
  filePath: string;
  expiresAt: string;
}

export { buildEditRequestBody, estimateCredits, MODEL_CREDITS_PER_IMAGE };
export type { EditImageParams, EditImageRequestBody };

export interface ImageProject {
  id: string;
  status: z.infer<typeof EditJobStatusSchema>;
  creditsCharged: number;
  downloads: { url: string; expiresAt: string }[];
  error: { message: string; code: string } | null;
}

/* ---------------------------------- helpers --------------------------------- */

function apiKey(): string {
  const key = process.env.MAGIC_HOUR_API_KEY;
  if (!key) throw new MagicHourError("not_configured", "MAGIC_HOUR_API_KEY is not set.");
  return key;
}

async function errorFromResponse(res: Response): Promise<MagicHourError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const parsed = ErrorBodySchema.safeParse(body);
  const upstreamCode = parsed.success ? parsed.data.code : undefined;
  const message = (parsed.success && parsed.data.message) || `Magic Hour returned HTTP ${res.status}`;

  switch (res.status) {
    case 401:
      return new MagicHourError("unauthorized", message, 401, body);
    case 402:
      if (upstreamCode === "subscription_required") return new MagicHourError("subscription_required", message, 402, body);
      if (upstreamCode === "plan_upgrade_required") return new MagicHourError("plan_upgrade_required", message, 402, body);
      return new MagicHourError("insufficient_credits", message, 402, body);
    case 429:
      return new MagicHourError("rate_limited", message, 429, body);
    case 400:
      return new MagicHourError("invalid_request", message, 400, body);
    case 404:
      return new MagicHourError("not_found", message, 404, body);
    case 422:
      return new MagicHourError("unprocessable", message, 422, body);
    default:
      return new MagicHourError("server_error", message, res.status, body);
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

let fetchImpl: FetchLike = (input, init) => fetch(input, init);

/** Test seam. */
export function __setFetch(impl: FetchLike | null): void {
  fetchImpl = impl ?? ((input, init) => fetch(input, init));
}

async function request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(`${MAGIC_HOUR_BASE_URL}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${apiKey()}`,
        "content-type": "application/json",
        accept: "application/json",
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof MagicHourError) throw err;
    throw new MagicHourError("network", "Could not reach Magic Hour.", null, String(err));
  }
  if (!res.ok) throw await errorFromResponse(res);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new MagicHourError("invalid_response", "Magic Hour returned a non-JSON response.", res.status);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new MagicHourError("invalid_response", "Magic Hour returned an unexpected response shape.", res.status, json);
  }
  return parsed.data;
}

/* ---------------------------------- calls ---------------------------------- */

/** POST /v1/files/upload-urls */
export async function getUploadUrl(extension: UploadExtension): Promise<UploadUrl> {
  const data = await request("/v1/files/upload-urls", UploadUrlsResponseSchema, {
    method: "POST",
    body: JSON.stringify({ items: [{ type: "image", extension }] }),
  });
  const [item] = data.items;
  return { uploadUrl: item.upload_url, filePath: item.file_path, expiresAt: item.expires_at };
}

/** PUT raw bytes to the presigned URL. The URL carries its own auth — no bearer header. */
export async function uploadImage(uploadUrl: string, bytes: Buffer, contentType: string): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(uploadUrl, {
      method: "PUT",
      body: new Uint8Array(bytes),
      headers: { "content-type": contentType },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new MagicHourError("network", "Could not upload the creative to Magic Hour.", null, String(err));
  }
  if (!res.ok) {
    throw new MagicHourError("server_error", `Upload to Magic Hour storage failed (HTTP ${res.status}).`, res.status);
  }
}

/** POST /v1/ai-image-editor */
export async function editImage(params: EditImageParams): Promise<{ id: string; creditsCharged: number; body: EditImageRequestBody }> {
  const body = buildEditRequestBody(params);
  const data = await request("/v1/ai-image-editor", EditResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { id: data.id, creditsCharged: data.credits_charged, body };
}

/** GET /v1/image-projects/{id} */
export async function getImageProject(id: string): Promise<ImageProject> {
  const data = await request(`/v1/image-projects/${encodeURIComponent(id)}`, ImageProjectSchema, { method: "GET" });
  return {
    id: data.id,
    status: data.status,
    creditsCharged: data.credits_charged,
    downloads: data.downloads.map((d) => ({ url: d.url, expiresAt: d.expires_at })),
    error: data.error,
  };
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onTick?: (project: ImageProject, elapsedMs: number) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/** Poll with jitter until complete. Throws `MagicHourError` on error, canceled, or timeout. */
export async function pollUntilComplete(id: string, options: PollOptions = {}): Promise<ImageProject> {
  const intervalMs = options.intervalMs ?? 2500;
  const timeoutMs = options.timeoutMs ?? 180_000;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = options.now ?? Date.now;
  const started = now();

  for (;;) {
    const project = await getImageProject(id);
    const elapsed = now() - started;
    options.onTick?.(project, elapsed);

    if (project.status === "complete") return project;
    if (project.status === "error") {
      throw new MagicHourError("render_failed", project.error?.message ?? "Render failed.", null, project.error);
    }
    if (project.status === "canceled") throw new MagicHourError("canceled", "The render was canceled.");
    if (elapsed >= timeoutMs) throw new MagicHourError("timeout", `Render did not finish within ${timeoutMs / 1000}s.`);

    const jitter = intervalMs * (0.8 + Math.random() * 0.4);
    await sleep(Math.min(jitter, Math.max(0, timeoutMs - elapsed)));
  }
}
