import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, errorResponse, parseJsonBody } from "@/lib/api";
import { billingEnabled, fulfillCheckout } from "@/lib/billing";
import { retrieveCheckoutSession } from "@/lib/clients/stripe";

export const runtime = "nodejs";

const ConfirmRequestSchema = z.object({ sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9]{1,200}$/) });

/**
 * POST /api/checkout/confirm — body: { sessionId }. Called when Stripe sends the buyer back, so the
 * reviews appear at once instead of when the webhook lands. Fulfillment is idempotent, so it doesn't
 * matter which of the two gets there first.
 */
export async function POST(request: Request) {
  if (!billingEnabled()) return apiError("not_configured", "Payments aren't set up on this deployment.", 404);
  const parsed = await parseJsonBody(request, ConfirmRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const outcome = await fulfillCheckout(await retrieveCheckoutSession(parsed.data.sessionId));
    const status = outcome.status === "already_fulfilled" ? "fulfilled" : outcome.status;
    return NextResponse.json({ status, reviews: outcome.reviews }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return errorResponse(err, "checkout.confirm");
  }
}
