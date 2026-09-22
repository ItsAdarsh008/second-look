# Stripe — Second Look

Everything payments. `DEPLOY.md` covers the rest of shipping the app and links here.

**Scope: Payments only.** One-time credit packs, `mode: "payment"`. No subscriptions, no Invoicing — reviews never expire, so there is nothing to renew, cancel or dun.

**The integration is already written and already conforms to Stripe's current guidance** (§6). There is no code to write. What's left is an account, two keys, a webhook and a test.

---

## Status

Account: **`acct_1UHukUIXXgSDMNPU`** (`second-look`), country CA, live mode.

> ## ⚠ Identity verification is past due
>
> **Task:** *Verify Adarshkrishna Thoduvakkal's identity* — provide a valid government-issued photo ID. Standard KYC; every account taking live payments has to verify the person behind it. Due **Sep 20, 2026**, now past.
>
> **What it actually blocks:**
> - **Payouts — blocked now.** "Won't be active until this is completed." Money can arrive and cannot leave.
> - **Payments — not blocked yet.** "Will be paused if volume reaches **CA$982**." Current volume CA$0, so there's roughly a thousand dollars of runway before charging stops.
> - Cartes Bancaires is already paused (a French card network — irrelevant to this buyer base).
>
> So it is not a same-day emergency for taking payments, but it *is* a hard block on ever being paid, and the runway is small enough that a decent launch day would hit it.
>
> **Settings → Business → Account status → the task → Start.** Review is usually under 24 hours, 2–3 business days for complicated ones. It needs government ID, so it's yours to do — I can't submit identity documents.

| | |
|---|---|
| Integration code | ✅ written, tested, deployed to production |
| Second Look Stripe account | ✅ `acct_1UHukUIXXgSDMNPU` |
| Statement descriptor | ✅ `2ND LOOK` |
| Business URL | ✅ `https://2nd-look.vercel.app` |
| Live webhook | ✅ `we_1UHvLFIXXgSDMNPU22fOazuu`, 3 events, API `2026-08-26.dahlia` |
| Restricted key | 🟡 staged in the dashboard — one click left (§1) |
| **Identity verification** | 🔴 **past due — payouts blocked now, payments pause at CA$982 volume** |
| Bank account for payouts | ⬜ §1 (needs identity cleared first) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` in Vercel | ✅ set, deployed — **paywall is live** |
| Live keys scoped to Preview too | ⚠️ §4 — preview deploys will take real money |
| Sandbox test | ⬜ §2 — skipped; live was set up first |
| End-to-end purchase test | ⬜ §5 — never run, in any environment |

**The paywall is off until `STRIPE_SECRET_KEY` exists.** Without it there's no header button, no pricing sheet, and every review is free and unlimited. `/api/wallet` and `/api/checkout` answer `{"error":{"code":"not_configured"}}` with a 404 — that's the healthy off state, not a broken route.

---

## 1. Account settings

Everything here is on `acct_1UHukUIXXgSDMNPU` (`second-look`). Not the tutoring account — `acct_1TsUlHEmnBQh1rd9` is Origin Tutoring, and charging through it would put `ORIGIN TUTORING` on buyers' statements and mix two businesses' balances and disputes.

- ✅ **Statement descriptor** — `2ND LOOK`. What a buyer sees on their card statement weeks later, when they've forgotten the purchase.
- ✅ **Business URL** — `https://2nd-look.vercel.app`.
- 🔴 **Identity verification** — past due. Blocks payouts outright; pauses payments once volume reaches CA$982. See the banner above.
- ⬜ **Attach a bank account.** Without one `payouts_enabled` stays false and money arrives but can never reach you.
- ⬜ **Branding** → Settings → Branding: name, icon, colours. This is the Checkout page and the receipt.

### The restricted key — one click left

Staged in the dashboard at **API keys → Create a secret key**, on the "Name and review your key" step:

- Name: `Second Look — Vercel production`
- Permissions: **1 permission — Checkout Sessions: Write**, and nothing else

Click **Create key**, copy the `rk_…` value, and put it straight into Vercel (§4). Stripe shows it once. I deliberately stopped before that click so the secret never lands in a transcript.

Verify the account once the CLI is logged into it:

```bash
stripe login
stripe get /v1/account | grep -E '"(charges_enabled|payouts_enabled|statement_descriptor)"'
```

Both `charges_enabled` and `payouts_enabled` must be `true`. `charges_enabled` alone means money arrives and stays in Stripe.

> On Git Bash, prefix API paths with `MSYS_NO_PATHCONV=1` or the shell rewrites `/v1/account` into a Windows path.

### Keys

- **Use a restricted key (`rk_…`), never the secret key (`sk_…`).** One permission: **Checkout Sessions: Write**. A leaked restricted key can't refund payments, read customers or move money. `STRIPE_SECRET_KEY` is only the variable's name — a restricted key belongs in it.
- **The publishable key has nowhere to go.** Checkout is hosted and redirect-based; there's no Stripe.js on the client. The app reads exactly two Stripe variables and neither is publishable.
- If a live `sk_…` has been pasted anywhere you're unsure about, roll it in the Dashboard.

### Currency

The app charges **USD** (`currency: "usd"` in `createCheckoutSession`), which is right for an international buyer base. A Canadian account settles in CAD, so Stripe applies a currency-conversion fee on top of processing. Real take per review is below sticker minus 2.9% + $0.30 — check the account's own rates before trusting a margin figure.

---

## 2. Sandbox — prove it before live

Sandbox and live are separate worlds. Keys, webhooks and signing secrets from one never work in the other, so going live repeats these steps rather than flipping a switch.

1. **Create a [sandbox](https://docs.stripe.com/sandboxes)** inside the Second Look account. Use a second, separate sandbox for local development.
2. **Restricted key:** Developers → API keys → Create restricted key → **Checkout Sessions: Write**.
3. **Webhook:** Developers → Webhooks → Add destination
   - URL: `https://2nd-look.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   - Copy the signing secret (`whsec_…`).

   **Webhooks are not optional.** They're what credits a buyer who closes the tab before the return page loads, and the only thing that credits delayed payment methods, which settle days later.
4. Put both in **Preview** in Vercel, redeploy, and run §5 against a preview URL.

---

## 3. Live

Only after §2 passes end to end.

1. **Vercel Pro.** Hobby is non-commercial; taking real money on it breaks Vercel's terms.
2. Confirm `charges_enabled` **and** `payouts_enabled` (§1).
3. ✅ **Restricted key staged** — finish it per §1.
4. ✅ **Live webhook already created** — `we_1UHvLFIXXgSDMNPU22fOazuu`, listening to the three checkout events on API `2026-08-26.dahlia`. Its signing secret is on the destination page behind the reveal icon; copy it into `STRIPE_WEBHOOK_SECRET`.
5. Put the live pair in **Production only**, redeploy.
6. **Make one real purchase and refund it** from the Dashboard. Note that refunding returns the money but does not take the reviews back (§7).

---

## 4. Environment variables

Vercel → Settings → Environment Variables. Mark both **Sensitive**.

| Variable | Value | Environment |
|---|---|---|
| `STRIPE_SECRET_KEY` | the **restricted** key (`rk_…`) | sandbox key → Preview, live key → Production |
| `STRIPE_WEBHOOK_SECRET` | that environment's own webhook signing secret | never share one across environments |

**Redeploy after any key change.** Whether the paywall exists at all is decided at build time, so a key added without a redeploy changes nothing.

> ### ⚠️ The live keys are currently on Preview as well as Production
>
> Every preview deployment — every branch, every PR — will charge real cards with real money, and its purchases land in the live Dashboard next to genuine ones. Preview is where you'd normally test with `4242 4242 4242 4242`, and that card will simply be declined against a live key.
>
> Fix it either way:
> - **Remove** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from Preview, leaving previews paywall-free, or
> - **Replace** them on Preview with a sandbox key and a sandbox webhook secret, which is what §2 assumes and what makes the §5 test script runnable.

> ### Housekeeping: `VERCEL_OIDC_TOKEN` is set manually
>
> It rode along from `.env.local`, where `vercel link` had written it. Vercel injects this per deployment on its own, so a pinned copy is at best dead weight and at worst a stale value shadowing the real one. Nothing in this app reads it. Remove it: `vercel env rm VERCEL_OIDC_TOKEN`.

---

## 5. Test

Against a preview URL with sandbox keys, or localhost (§8).

1. Header shows **1 free**, and *"Your first review is free."* sits next to **Run a second look**.
2. Run a review. It succeeds and the free one is consumed.
3. Run a second → the **pricing sheet** opens instead.
4. Buy **Starter** with `4242 4242 4242 4242`, any future expiry, any CVC.
5. Back on the site: *"10 reviews added"* plus a recovery code. Header reads **10 reviews left**.
6. Stripe Dashboard → the webhook delivery answered **200**.
7. In a private window, open the header button → restore the recovery code → the balance follows it.
8. Force a failure (stop the dev server mid-review) and confirm the review is refunded rather than lost.

---

## 6. How it works, and why it's already correct

No accounts. The first visit gets a random wallet id in an httpOnly cookie; paid reviews are a counter against it in Redis. That id doubles as the **recovery code** — four groups of five Crockford base32 characters, so `O`/`0` and `I`/`1` survive being read aloud. It's shown on the Checkout page, in the notice after paying, and in the pricing sheet.

Every review and render is **charged before it runs and refunded if it fails**, so a crash can neither hand out free reviews nor cost a buyer one. The server refuses a review with no allowance (HTTP 402) even if the page didn't know.

Checked against Stripe's current guidance (API `2026-08-26.dahlia`, Node SDK 22.6.2) — it conforms on every point. Recorded so nobody "fixes" it later:

| Rule | Where |
|---|---|
| Hosted Checkout Sessions for one-time payments | `createCheckoutSession`, `mode: "payment"` |
| Latest API version pinned explicitly | `API_VERSION` in `src/lib/clients/stripe.ts` |
| `integration_identifier` tag with an 8-letter suffix | `second-look-credit-packs-qhzmvtra` |
| No `payment_method_types` — dynamic payment methods from the Dashboard | omitted deliberately |
| Client instance, not the deprecated global-key pattern | `new Stripe(key, …)`, cached |
| Fulfillment in the webhook, gated on `payment_status` | `fulfillCheckout`, not the success page |
| `async_payment_succeeded` handled for delayed methods | `CHECKOUT_EVENTS` |
| Raw body for signature verification | `request.text()`, never parsed JSON |
| Exactly-once fulfillment | `fulfilled:<session id>` claim key, rolled back on failure |
| Retry only what's worth retrying | 500 for store failures, 200 for foreign sessions |
| Zod at the boundary, no Stripe types leaking outward | `CheckoutSessionSchema`, `narrow()` |
| `automatic_tax` left off without a registration | documented in `createCheckoutSession` |

Covered by `src/lib/billing.test.ts` and `src/lib/clients/stripe.test.ts`: charging, refunds, free-review caps, exactly-once fulfillment and signature rejection, with no network and no keys.

**Tax:** the app collects none. If you have to, add registrations in Stripe Tax *first*, then enable `automatic_tax` in `createCheckoutSession`. Turning it on without a registration collects nothing while looking like it works.

### Packs

| | Reviews | Price | Per review | After 2.9% + $0.30 |
|---|---|---|---|---|
| Free | 1 | — | — | — |
| Starter | 10 | $15 | $1.50 | $1.43 |
| Team | 50 | $59 | $1.18 | $1.14 |
| Agency | 200 | $199 | $0.99 | $0.96 |

US-card figures, before any currency conversion. Against ~$0.25 of Claude per review. Every review includes one Magic Hour alternative; extra alternatives cost one review each. The free review is capped at 1 per browser and 2 per network per 30 days, so clearing cookies doesn't mint more.

Edit `PACKS` in `src/lib/pricing.ts` — the pricing sheet and checkout both read it. `FREE_REVIEWS` and `RENDERS_PER_REVIEW` live there too; `FREE_PER_NETWORK` is in `src/lib/billing.ts`.

**On running costs:** free reviews are the one cost nobody pays for — a stranger's first review is ~$0.25 out of your Anthropic balance with no matching revenue. There is deliberately **no Console spend limit set**; the plan is to route Stripe payouts into Anthropic credits once volume justifies it. Worth knowing when you build that: this account's payout schedule is weekly with a 3-day delay, so revenue lands days after the spend it's covering. Keep a buffer in the Anthropic balance rather than running it to zero.

---

## 7. Support and troubleshooting

| What people see | Fix |
|---|---|
| No header button or pricing sheet after adding keys | Built before the keys existed — **redeploy** |
| "Payments are unavailable right now. Nothing was charged." | Stripe rejected the key or a permission — Vercel logs, `billing.checkout` line, find the request id in the Dashboard's request log |
| "Payments need shared storage (Upstash Redis) on this deployment." | Paywall on, Redis missing — connect Upstash |
| Paid, but the reviews didn't appear | Webhook failing (wrong secret or URL). Fix it, then **Resend** the event — it's credited once however many times it arrives |
| 404 with `{"error":{"code":"not_configured"}}` | Working as designed: no `STRIPE_SECRET_KEY`, paywall off |

Vercel logs carry one JSON line per event — filter on `billing.charged`, `billing.refunded`, `billing.payment_required`, `billing.checkout`, `billing.fulfilled`, `billing.webhook` (its `outcome` says what happened).

- **Lost recovery code:** find the payment in the Dashboard. The checkout session's **client reference ID** is the wallet id — the code without its dashes. The session's product description shows it formatted.
- **Refunds:** refunding returns the money but does not take the reviews back. To remove them, lower `wallet:<id>:reviews` in the Upstash console.
- **Granting reviews by hand** (press, support): set `wallet:<id>:reviews`, and set `wallet:<id>:purchased` above zero too, or the code can't be restored.
- **Disputes** arrive in the Dashboard as usual. The app doesn't react to them.

---

## 8. Local development

With `STRIPE_SECRET_KEY` unset there's no paywall. To test one, put a **development sandbox's** restricted key in `.env.local` and forward webhooks:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints the whsec_… to use
```

Then run §5 against `localhost:3000`. The free review is capped per network as well as per browser, so after two locally, delete `.data/store/__counters.json` to get them back.

```bash
npm run typecheck && npm run lint && npm test    # before pushing
```
