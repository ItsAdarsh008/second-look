import { readFile } from "node:fs/promises";
import path from "node:path";
import { apiError } from "@/lib/api";
import { LOCAL_UPLOAD_DIR, sniffImageType } from "@/lib/clients/creative";

export const runtime = "nodejs";

/** GET /api/uploads/[name] — serves local-dev uploads. Production uploads live on Vercel Blob. */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[A-Za-z0-9_-]+\.(png|jpg|webp)$/.test(name)) return apiError("not_found", "Not found.", 404);
  try {
    const bytes = await readFile(path.join(LOCAL_UPLOAD_DIR, name));
    const type = sniffImageType(bytes);
    if (!type) return apiError("not_found", "Not found.", 404);
    return new Response(new Uint8Array(bytes), {
      headers: { "content-type": type.mediaType, "cache-control": "private, max-age=3600" },
    });
  } catch {
    return apiError("not_found", "Not found.", 404);
  }
}
