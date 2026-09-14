import "server-only";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MAX_UPLOAD_BYTES } from "./creative";

export const ALLOWED_UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export class BlobUploadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BlobUploadError";
  }
}

/** Server half of the Vercel Blob client-upload handshake: issues a scoped token for one image. */
export async function handleBlobUpload(request: Request, body: HandleUploadBody): Promise<unknown> {
  try {
    return await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...ALLOWED_UPLOAD_TYPES],
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
  } catch (err) {
    throw new BlobUploadError("Upload could not be authorized.", { cause: err });
  }
}
