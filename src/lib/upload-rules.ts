/** What the light table and the upload card accept. The server checks again (src/lib/clients/creative.ts). */
export const CREATIVE_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp"];
export const MAX_CREATIVE_BYTES = 10 * 1024 * 1024;

/** Why a chosen file can't go on the table, or null when it can. */
export function creativeFileError(file: File): string | null {
  if (!CREATIVE_TYPES.includes(file.type)) return "Use a PNG, JPEG or WebP image.";
  if (file.size > MAX_CREATIVE_BYTES) return "That image is over 10MB.";
  return null;
}
