import { NextResponse } from "next/server";
import { apiError, errorResponse } from "@/lib/api";
import { getJob, refreshJob } from "@/lib/generate";

export const runtime = "nodejs";

/** GET /api/generate/[jobId] — polls Magic Hour once, persists, and returns the job. */
export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(jobId)) return apiError("not_found", "No job with that id.", 404);
  try {
    const job = await getJob(jobId);
    if (!job) return apiError("not_found", "No job with that id.", 404);
    return NextResponse.json(await refreshJob(job), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return errorResponse(err, "generate.poll");
  }
}
