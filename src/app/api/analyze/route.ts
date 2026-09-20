import { NextResponse } from "next/server";
import { analyzeCampaign } from "@/lib/analyze";
import type { AnalyzeStreamEvent } from "@/lib/analyze-stream";
import { apiError, errorResponse, parseJsonBody } from "@/lib/api";
import { billingEnabled, chargeReview, grantRenders, refundReview, type ReviewCharge } from "@/lib/billing";
import { capabilities } from "@/lib/capabilities";
import { screenCampaignInput } from "@/lib/guard";
import { clientIp, enforceRateLimit } from "@/lib/limits";
import { log } from "@/lib/logger";
import { CampaignInputSchema, type AnalysisResult, type ApiErrorBody } from "@/lib/schema";
import { ANALYSIS_TTL_SECONDS, getStore, keys } from "@/lib/store";
import { ensureWallet } from "@/lib/wallet-cookie";

export const runtime = "nodejs";
// The build plan suggests 60s. A single Opus vision call with adaptive thinking
// can exceed that on a dense campaign, so allow the Fluid-compute maximum.
export const maxDuration = 300;

/**
 * POST /api/analyze — body: CampaignInput.
 * Returns the AnalysisResult as JSON, or, with `Accept: application/x-ndjson`,
 * streams pipeline stages as they resolve and ends with a `complete` event.
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, CampaignInputSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const screen = screenCampaignInput(input);
  if (!screen.ok) {
    log.warn("request.rejected", { reason: screen.code });
    return apiError(screen.code, screen.message, 422);
  }

  // Fail fast (without spending the caller's rate limit) when analysis isn't configured.
  if (!capabilities().analysisAvailable) {
    return apiError("not_configured", "Analysis is not configured on this deployment.", 503);
  }

  // Charged before the model runs, refunded if the review doesn't reach the caller.
  let charge: ReviewCharge;
  try {
    const ip = clientIp(request.headers);
    await enforceRateLimit("analyze", ip);
    charge = await chargeReview(billingEnabled() ? await ensureWallet() : null, ip);
  } catch (err) {
    return errorResponse(err, "analyze.admit");
  }

  const store = getStore();
  const finish = async (result: AnalysisResult) => {
    await store.setJSON(keys.analysis(result.id), result, ANALYSIS_TTL_SECONDS);
    await grantRenders(result.id, charge, store);
  };

  if (!request.headers.get("accept")?.includes("application/x-ndjson")) {
    try {
      const result = await analyzeCampaign(input);
      await finish(result);
      return NextResponse.json(result);
    } catch (err) {
      await refundReview(charge, store).catch(() => {});
      return errorResponse(err, "analyze");
    }
  }

  const encoder = new TextEncoder();
  // Set when the caller goes away (closed the tab, or edited the brief mid-run). The review still
  // finishes, but they never see it, so it isn't charged.
  let abandoned = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalyzeStreamEvent) => {
        if (abandoned) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          abandoned = true;
        }
      };
      try {
        const result = await analyzeCampaign(input, { onStage: send });
        await finish(result);
        send({ stage: "complete", result });
        if (abandoned) await refundReview(charge, store).catch(() => {});
      } catch (err) {
        await refundReview(charge, store).catch(() => {});
        const response = errorResponse(err, "analyze.stream");
        const body = (await response.json()) as ApiErrorBody;
        send({ stage: "error", ...body });
      } finally {
        if (!abandoned) controller.close();
      }
    },
    cancel() {
      abandoned = true;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
