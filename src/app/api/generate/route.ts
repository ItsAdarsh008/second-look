import { NextResponse } from "next/server";
import { errorResponse, parseJsonBody } from "@/lib/api";
import { billingEnabled, chargeRender, recordRenderCharge, refundRender, type RenderCharge } from "@/lib/billing";
import { GenerateRequestSchema, startGeneration } from "@/lib/generate";
import { clientIp, enforceRateLimit } from "@/lib/limits";
import { readWallet } from "@/lib/wallet-cookie";

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

  let charge: RenderCharge;
  try {
    await enforceRateLimit("generate", clientIp(request.headers));
    charge = await chargeRender(parsed.data.analysisId, billingEnabled() ? await readWallet() : null);
  } catch (err) {
    return errorResponse(err, "generate.admit");
  }

  try {
    const job = await startGeneration(parsed.data);
    // The render is already submitted; not being able to refund it later mustn't fail the request.
    await recordRenderCharge(job.id, charge).catch(() => {});
    return NextResponse.json({
      jobId: job.id,
      magicHourProjectId: job.magicHourProjectId,
      prompt: job.prompt,
      creditsCharged: job.creditsCharged,
      requestBody: job.requestBody,
      job,
    });
  } catch (err) {
    await refundRender(charge).catch(() => {});
    return errorResponse(err, "generate");
  }
}
