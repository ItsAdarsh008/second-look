import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, errorResponse, parseJsonBody } from "@/lib/api";
import { billingEnabled, walletHasPurchases, walletSummary } from "@/lib/billing";
import { clientIp, enforceRateLimit } from "@/lib/limits";
import { WalletIdSchema, normalizeWalletCode } from "@/lib/pricing";
import { setWallet } from "@/lib/wallet-cookie";

export const runtime = "nodejs";

const RestoreRequestSchema = z.object({ code: z.string().trim().min(1).max(64) });

/** POST /api/wallet/restore — body: { code }. Moves this browser onto the wallet a recovery code names. */
export async function POST(request: Request) {
  if (!billingEnabled()) return apiError("not_configured", "Payments aren't set up on this deployment.", 404);
  const parsed = await parseJsonBody(request, RestoreRequestSchema);
  if (!parsed.ok) return parsed.response;

  const ip = clientIp(request.headers);
  try {
    await enforceRateLimit("restore", ip);
    const wallet = WalletIdSchema.safeParse(normalizeWalletCode(parsed.data.code));
    if (!wallet.success || !(await walletHasPurchases(wallet.data))) {
      return apiError("wallet_not_found", "That code doesn't match any purchased reviews. Check it for typos: it's four groups of five letters and digits.", 404);
    }
    await setWallet(wallet.data);
    return NextResponse.json(await walletSummary(wallet.data, ip), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return errorResponse(err, "wallet.restore");
  }
}
