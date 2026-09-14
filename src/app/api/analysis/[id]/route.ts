import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { AnalysisResultSchema } from "@/lib/schema";
import { getStore, keys } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/analysis/[id] — public read for shareable permalinks. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return apiError("not_found", "No analysis with that id.", 404);
  const analysis = await getStore().getJSON(keys.analysis(id), AnalysisResultSchema);
  if (!analysis) return apiError("not_found", "No analysis with that id.", 404);
  return NextResponse.json(analysis, { headers: { "cache-control": "public, max-age=60" } });
}
