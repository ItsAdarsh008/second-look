import { NextResponse } from "next/server";
import { apiError, errorResponse } from "@/lib/api";
import { billingEnabled, walletSummary } from "@/lib/billing";
import { clientIp } from "@/lib/limits";
import { ensureWallet } from "@/lib/wallet-cookie";

export const runtime = "nodejs";

/**
 * GET /api/wallet?analysis=<id> — what this visitor can run: free and paid reviews left, the
 * recovery code once they've bought any, and the included renders left on `analysis` if given.
 * Sets the wallet cookie on first visit.
 */
export async function GET(request: Request) {
  if (!billingEnabled()) return apiError("not_configured", "Payments aren't set up on this deployment.", 404);
  const analysis = new URL(request.url).searchParams.get("analysis");
  const analysisId = analysis && /^[A-Za-z0-9_-]{1,64}$/.test(analysis) ? analysis : null;
  try {
    const wallet = await ensureWallet();
    const summary = await walletSummary(wallet, clientIp(request.headers), analysisId);
    return NextResponse.json(summary, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return errorResponse(err, "wallet");
  }
}
