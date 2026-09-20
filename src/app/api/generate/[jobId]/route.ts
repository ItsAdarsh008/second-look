import { NextResponse } from "next/server";
import { apiError, errorResponse } from "@/lib/api";
import { refundFailedRender } from "@/lib/billing";
import { getJob, refreshJob } from "@/lib/generate";

export const runtime = "nodejs";

const FAILED = new Set(["error", "canceled"]);

/** GET /api/generate/[jobId] — polls Magic Hour once, persists, and returns the job. */
export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(jobId)) return apiError("not_found", "No job with that id.", 404);
  try {
    const job = await getJob(jobId);
    if (!job) return apiError("not_found", "No job with that id.", 404);
    const updated = await refreshJob(job);
    // A render Magic Hour couldn't finish gives back what it cost. Pays out once, whoever polls.
    if (FAILED.has(updated.status) && !FAILED.has(job.status)) await refundFailedRender(job.id).catch(() => {});
    return NextResponse.json(updated, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return errorResponse(err, "generate.poll");
  }
}
