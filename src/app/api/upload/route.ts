import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HandleUploadBody } from "@vercel/blob/client";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, errorResponse } from "@/lib/api";
import { blobConfigured, handleBlobUpload } from "@/lib/clients/blob";
import { LOCAL_UPLOAD_DIR, MAX_UPLOAD_BYTES, sniffImageType } from "@/lib/clients/creative";
import { clientIp, enforceRateLimit } from "@/lib/limits";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

const HandshakeSchema = z.object({ type: z.string(), payload: z.record(z.string(), z.unknown()) });

/**
 * POST /api/upload
 * - With BLOB_READ_WRITE_TOKEN: the Vercel Blob client-upload handshake (JSON body). The browser uploads
 *   directly to Blob; this route only issues a token restricted to PNG/JPEG/WebP under 10MB.
 * - Without it (local dev): multipart form with a `file` field, validated by content and stored under .data/uploads.
 */
export async function POST(request: Request) {
  try {
    await enforceRateLimit("upload", clientIp(request.headers));
  } catch (err) {
    return errorResponse(err, "upload.ratelimit");
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    if (!blobConfigured()) return apiError("upload_not_configured", "Blob storage isn't configured; use a multipart upload.", 400);
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return apiError("invalid_json", "Request body must be JSON.", 400);
    }
    if (!HandshakeSchema.safeParse(raw).success) return apiError("invalid_request", "Not a Blob upload handshake.", 400);
    try {
      return NextResponse.json(await handleBlobUpload(request, raw as HandleUploadBody));
    } catch (err) {
      return errorResponse(err, "upload.blob");
    }
  }

  if (blobConfigured()) return apiError("invalid_request", "Uploads go directly to Blob storage on this deployment.", 400);
  if (!contentType.includes("multipart/form-data")) return apiError("invalid_request", "Expected a multipart form upload.", 400);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return apiError("invalid_request", "Could not read the upload.", 400);
  }
  if (!(file instanceof File)) return apiError("invalid_request", "Attach an image in the `file` field.", 400);
  if (file.size > MAX_UPLOAD_BYTES) return apiError("too_large", "Images must be 10MB or smaller.", 413);

  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return apiError("unsupported_type", "Upload a PNG, JPEG or WebP image.", 415);

  const name = `${nanoid(16)}.${type.extension}`;
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, name), bytes);
  log.info("upload.completed", { bytes: bytes.length, mode: "local" });
  return NextResponse.json({ url: `/api/uploads/${name}` });
}
