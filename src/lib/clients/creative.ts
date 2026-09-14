import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type CreativeMediaType = "image/png" | "image/jpeg" | "image/webp";
export type CreativeExtension = "png" | "jpg" | "webp";

export interface Creative {
  bytes: Buffer;
  mediaType: CreativeMediaType;
  extension: CreativeExtension;
  width: number;
  height: number;
}

export type CreativeErrorCode = "not_found" | "forbidden_host" | "too_large" | "unsupported_type" | "fetch_failed";

export class CreativeError extends Error {
  readonly code: CreativeErrorCode;
  constructor(code: CreativeErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CreativeError";
    this.code = code;
  }
}

/** Only Vercel Blob storage may be fetched remotely — no arbitrary URLs (SSRF). */
function isAllowedRemote(url: URL): boolean {
  return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
}

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

export function sniffImageType(bytes: Uint8Array): { mediaType: CreativeMediaType; extension: CreativeExtension } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mediaType: "image/png", extension: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mediaType: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { mediaType: "image/webp", extension: "webp" };
  }
  return null;
}

async function readLocal(imageUrl: string): Promise<Buffer> {
  const [pathname] = imageUrl.split("?");
  let filePath: string | null = null;
  if (pathname.startsWith("/api/uploads/")) {
    const name = pathname.slice("/api/uploads/".length);
    if (SAFE_NAME.test(name)) filePath = path.join(LOCAL_UPLOAD_DIR, name);
  } else if (pathname.startsWith("/cases/")) {
    const name = pathname.slice("/cases/".length);
    if (SAFE_NAME.test(name)) filePath = path.join(PUBLIC_DIR, "cases", name);
  }
  if (!filePath) throw new CreativeError("not_found", "That creative path isn't one this app serves.");
  try {
    return await readFile(filePath);
  } catch (err) {
    throw new CreativeError("not_found", "The creative could not be found.", { cause: err });
  }
}

async function readRemote(imageUrl: string): Promise<Buffer> {
  const url = new URL(imageUrl);
  if (!isAllowedRemote(url)) throw new CreativeError("forbidden_host", "Creative must be uploaded through this app.");
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  } catch (err) {
    throw new CreativeError("fetch_failed", "Could not download the creative.", { cause: err });
  }
  if (res.status === 404) throw new CreativeError("not_found", "The creative could not be found.");
  if (!res.ok) throw new CreativeError("fetch_failed", `Could not download the creative (HTTP ${res.status}).`);
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES) throw new CreativeError("too_large", "Creative is larger than 10MB.");
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_UPLOAD_BYTES) throw new CreativeError("too_large", "Creative is larger than 10MB.");
  return bytes;
}

/** Load creative bytes from an app path or Vercel Blob URL and validate the image type by content. */
export async function loadCreative(imageUrl: string): Promise<Creative> {
  const bytes = imageUrl.startsWith("/") ? await readLocal(imageUrl) : await readRemote(imageUrl);
  if (bytes.length > MAX_UPLOAD_BYTES) throw new CreativeError("too_large", "Creative is larger than 10MB.");
  const type = sniffImageType(bytes);
  if (!type) throw new CreativeError("unsupported_type", "Creative must be a PNG, JPEG or WebP image.");
  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(bytes).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch (err) {
    throw new CreativeError("unsupported_type", "The image could not be decoded.", { cause: err });
  }
  return { bytes, ...type, width, height };
}

/**
 * A copy sized for vision input: long edge ≤ 1568px, re-encoded under the
 * API's per-image limit. Aspect ratio is preserved, so normalized bounding
 * boxes map straight back onto the original.
 */
export async function toVisionImage(creative: Creative): Promise<{ data: string; mediaType: CreativeMediaType }> {
  const longEdge = Math.max(creative.width, creative.height);
  if (longEdge <= 1568 && creative.bytes.length <= 3_500_000) {
    return { data: creative.bytes.toString("base64"), mediaType: creative.mediaType };
  }
  const resized = await sharp(creative.bytes)
    .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  return { data: resized.toString("base64"), mediaType: "image/jpeg" };
}
