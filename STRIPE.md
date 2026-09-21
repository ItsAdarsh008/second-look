# Stripe — Second Look

Everything payments. `DEPLOY.md` covers the rest of shipping the app and links here.

**Scope: Payments only.** One-time credit packs, `mode: "payment"`. No subscriptions, no Invoicing — reviews never expire, so there is nothing to renew, cancel or dun.

**The integration is already written and already conforms to Stripe's current guidance** (§6). There is no code to write. What's left is an account, two keys, a webhook and a test.

---

## Status

| | |
|---|---|
| Integration code | ✅ written, tested, deployed to production |
| Second Look Stripe account | ✅ created |
| Account settings — descriptor, business URL, bank account | ⬜ §1 |
| Sandbox key + webhook, tested end to end | ⬜ §2 |
| Live key + webhook | ⬜ §3 |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` in Vercel | ⬜ §4 |

**The paywall is off until `STRIPE_SECRET_KEY` exists.** Without it there's no header button, no pricing sheet, and every review is free and unlimited. `/api/wallet` and `/api/checkout` answer `{"error":{"code":"not_configured"}}` with a 404 — that's the healthy off state, not a broken route.

---

## 1. Account settings

Do these on the **Second Look** account, not the tutoring one. `acct_1TsUlHEmnBQh1rd9` is Origin Tutoring — descriptor `ORIGIN TUTORING`, business URL `origintutoring.vercel.app`, no bank account attached. Charging through it would put an unrecognised name on buyers' statements, which is a leading cause of chargebacks, and would mix two businesses' balances and disputes.

1. **Statement descriptor** → `SECOND LOOK`. Settings → Business. This is the single highest-value setting here: it's what a buyer sees on their card statement three weeks later when they've forgotten the purchase.
2. **Business URL** → `https://2nd-look.vercel.app`.
3. **Attach a bank account.** Without one `payouts_enabled` stays false, and you can take live charges while none of the money can ever reach you.
4. **Branding** → Settings → Branding: name, icon, colours. This is the Checkout page and the receipt.

Confirm with the CLI, once it's logged into the new account:

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
3. **Create the restricted key again in live mode** — same single permission.
4. **Create the webhook again in live mode** — same URL, same events, and copy its *new* signing secret.
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
