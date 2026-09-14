import { NextResponse } from "next/server";
import { errorResponse, parseJsonBody } from "@/lib/api";
import { GenerateRequestSchema, startGeneration } from "@/lib/generate";
import { clientIp, enforceRateLimit } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/generate — body: { analysisId, findingIds?, model?, resolution?, imageCount?, promptOverride? }.
 * Uploads the creative to Magic Hour, submits the edit, and returns immediately. The client polls
 * GET /api/generate/[jobId].
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, GenerateRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await enforceRateLimit("generate", clientIp(request.headers));
    const job = await startGeneration(parsed.data);
    return NextResponse.json({
      jobId: job.id,
      magicHourProjectId: job.magicHourProjectId,
      prompt: job.prompt,
      creditsCharged: job.creditsCharged,
      requestBody: job.requestBody,
      job,
    });
  } catch (err) {
    return errorResponse(err, "generate");
  }
}
