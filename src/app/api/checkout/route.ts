import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, errorResponse, parseJsonBody } from "@/lib/api";
import { billingEnabled, purchaseMetadata } from "@/lib/billing";
import { createCheckoutSession } from "@/lib/clients/stripe";
import { clientIp, enforceRateLimit } from "@/lib/limits";
import { log } from "@/lib/logger";
import { PackIdSchema, RENDERS_PER_REVIEW, formatWalletCode, getPack } from "@/lib/pricing";
import { ensureWallet } from "@/lib/wallet-cookie";

export const runtime = "nodejs";

const CheckoutRequestSchema = z.object({ pack: PackIdSchema });

/** POST /api/checkout — body: { pack }. Returns the URL of a Stripe-hosted Checkout page for that pack. */
export async function POST(request: Request) {
  if (!billingEnabled()) return apiError("not_configured", "Payments aren't set up on this deployment.", 404);
  const parsed = await parseJsonBody(request, CheckoutRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await enforceRateLimit("checkout", clientIp(request.headers));
    const wallet = await ensureWallet();
    const pack = getPack(parsed.data.pack);
    const origin = new URL(request.url).origin;
    const session = await createCheckoutSession({
      clientReferenceId: wallet,
      productName: `Second Look: ${pack.reviews} reviews`,
      // Shown on the Checkout page, so the buyer can note the code before paying.
      productDescription: `${pack.name} pack. Each review includes ${RENDERS_PER_REVIEW === 1 ? "one alternative" : `${RENDERS_PER_REVIEW} alternatives`} from Magic Hour. Reviews never expire. Recovery code: ${formatWalletCode(wallet)}`,
      unitAmountCents: pack.priceCents,
      metadata: purchaseMetadata(wallet, pack.id),
      successUrl: `${origin}/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/?purchase=cancelled`,
    });
    if (!session.url) return apiError("payment_unavailable", "Stripe didn't return a checkout page. Nothing was charged. Try again.", 502);
    log.info("billing.checkout", { pack: pack.id });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return errorResponse(err, "checkout");
  }
}
