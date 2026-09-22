# Deploying Second Look

Live: **https://2nd-look.vercel.app** (Vercel project `adarsh-eeb5/second-look`)

---

## Already done

| | |
|---|---|
| Vercel project, connected to the repo | ✅ `second-look`, production alias `2nd-look.vercel.app` |
| `ANTHROPIC_API_KEY`, `MAGIC_HOUR_API_KEY` | ✅ set on Production + Preview |
| Upstash Redis + Vercel Blob | ✅ connected, variables injected |
| `MAX_DAILY_CREDITS` | ✅ set |
| 300-second analyze route | ✅ deployed and running on the current plan |
| `typecheck` / `lint` / `test` / `build` | ✅ all green (100 tests, 21 routes) |
| Payments work committed and pushed | ✅ wallets, packs, Stripe checkout + webhook, on `origin/main` |
| Payments build deployed to production | ✅ `second-look-5kya1t6w8`, serving `2nd-look.vercel.app` |

### Deploying, and how to tell it worked

**`git push` does not deploy this project.** Every deployment here was made from the CLI, and a push to `main` produced no build. Deploy with:

```bash
vercel deploy --prod
```

To make pushes deploy instead, attach the repo under **Vercel → Settings → Git** and set the production branch to `main`.

**Check the response body, not the status code.** With no Stripe key set, `/api/wallet` and `/api/checkout` return **404 on purpose** — that's `billingEnabled()` returning false, not a missing route. The bodies tell them apart:

| Response to `curl https://2nd-look.vercel.app/api/wallet` | Means |
|---|---|
| `{"error":{"code":"not_configured",…}}` | Payments code is deployed, paywall is off — **current state** |
| Next.js's HTML 404 page | The payments build isn't live |
| A 302 to `vercel.com/sso-api` | You used the wrong domain — `second-look-adarsh-eeb5.vercel.app` and raw deployment URLs sit behind deployment protection. Use `2nd-look.vercel.app`. |

---

## Remaining steps

### 1. Anthropic — credits ✅

Credits are loaded. One review costs **~$0.25** (Opus 5, high effort, ~16k max output); plan at **$0.50** to absorb retries and cold caches. Roughly: you + testers **$25** · 50 users **$75** · 200 users **$300**, assuming ~3 reviews per person per month.

**No spend limit is set, deliberately.** The intended backstop is routing Stripe payouts into Anthropic credits once volume justifies it, rather than a Console cap. Two things to know while that's the plan:

- Payouts land on a weekly schedule with a 3-day delay, so revenue arrives days after the spend it covers. Keep a buffer rather than running the balance to zero.
- The app caps each visitor at **5 reviews an hour** (`src/lib/limits.ts`), which holds one stranger to ~$2.50/hour, but nothing caps the total. A launch spike is bounded only by the credit balance.

Check your tier on the [Rate limits page](https://platform.claude.com/settings/limits) before a public launch — Start caps at $500/month, and that ceiling applies whether or not you set one of your own.

### 2. Stripe — optional, turns the paywall on

**See `STRIPE.md`.** Account settings, keys, webhook, the sandbox-then-live order, testing and the support runbook all live there.

Scope is Payments only: one-time credit packs. The integration is already written and conforms to Stripe's current guidance — there's no code to write. Skip it entirely and every review stays free and unlimited.

### 3. Two more environment variables

Vercel → Settings → Environment Variables. Mark both **Sensitive**.

| Variable | Value | Environment |
|---|---|---|
| `STRIPE_SECRET_KEY` | the **restricted** key (`rk_…`) | sandbox key → Preview, live key → Production |
| `STRIPE_WEBHOOK_SECRET` | that environment's own webhook signing secret | never share one across environments |

Set `NEXT_PUBLIC_SITE_URL` to `https://2nd-look.vercel.app` so link previews and Checkout return URLs use the canonical domain rather than whichever deployment URL served the request.

**Redeploy after any key change.** Whether reviews, generation and the paywall are on is baked in at build time.

### 4. Verify on the live URL

1. Landing page shows the first case on the light table with *"Can you spot the issue?"*. With Stripe on, the header shows **1 free** and *"Your first review is free."* sits by **Run a second look**.
2. **Run a real review** — upload an ad or open a case, click **Run a second look**. ~1 minute. *"Live analysis is off on this deployment"* means the key isn't set or you haven't redeployed.
3. **Generate an alternative** from *Alternatives to consider*; the request payload shows beside it.
4. **Share the report** — the `/a/<id>` link opens in a private window.
5. **Paywall** (sandbox): run a second review → pricing sheet opens. Buy Starter with `4242 4242 4242 4242`, any future expiry/CVC. You should see *"10 reviews added"* plus a recovery code, and the header reads **10 reviews left**. Stripe's webhook log shows a **200**. In a private window, restore the recovery code and confirm the balance follows.
6. **Link preview** — open `/opengraph-image`.

### 5. Gallery — built ✅, but **read it before you launch**

Built 2026-09-21 and committed. Case pages now render real findings at zero API cost per view.

| Case | Findings | Alternative rendered |
|---|---|---|
| `starbucks-korea` | 3 — 2 critical, 1 high | none, and that's the point: every finding is in the name, the date or the copy |
| `rising-sun-rays` | 1 critical (image) | yes, 5 credits |
| `green-hat` | 1 moderate (image) | yes, 5 credits |

All three ran **leave-one-out** — each case's own incident was withheld from the corpus, so nothing cites itself.

> ### ⬜ TODO — review and edit the generated copy
>
> These are model-written findings that are about to be the most-read pages on the site, and the Tank Day case is the whole pitch. Read all five findings end to end before any public post, checking that:
> - every `claim` is specific and falsifiable, not "may be culturally insensitive" (product rule 3)
> - every `precedent` is real and actually supports the claim (rule 2) — the starbucks findings cite 2, 2 and 1
> - no copy anywhere reads as "fixed", "safe", "cleared" or "approved" (rule 1)
>
> Edit `src/data/cases/results/<slug>.json` by hand where the wording is weak, then `vercel deploy --prod`. Re-running `cases:build` overwrites the whole file, so edit *or* regenerate, not both.

To rebuild from scratch:

```bash
# needs ANTHROPIC_API_KEY + MAGIC_HOUR_API_KEY in .env.local
npm run cases:build -- --generate     # 3 reviews (~$1) + 10 Magic Hour credits
git add src/data/cases/results public/cases/generated
git commit -m "Publish case study results"
vercel deploy --prod                  # a push alone will not deploy
```

### 6. Calibrate the real cost (optional, ~$3)

```bash
npm run eval          # 9 reviews
```

Divide that day's Opus 5 spend by 9. If it's far off $0.25, revisit step 1's numbers.

### 7. Launch checklist

- [x] Redeployed since the last env-var change — paywall live as of second-look-ilhg1kn80
- [x] Anthropic credits loaded (no spend limit, by choice — step 1)
- [x] Gallery pre-built (step 5) — ⬜ **still needs a human read of the generated findings**
- [ ] `MAX_DAILY_CREDITS` set to what you'll spend on Magic Hour per UTC day, and the Magic Hour account holds at least that
- [ ] If charging: the whole of `STRIPE.md` §1–§5, then live keys in Production only, one real purchase made and refunded, live webhook delivering 200s
- [ ] Demo clips recorded (below) **before** you post

---

## Reference

### Money

- **Claude:** only "Run a second look" costs anything. The game, case pages and link previews are free to serve. ~$0.25/review; retry doubles it; worst case ~$1.
- **Magic Hour:** its own credits. `flux-2-klein` (default) 5/image; `gpt-image-2` billed **100** on a real 1k run, not the 50 listed — trust the charge Magic Hour returns, not this table. `flux-2-klein` is weak at editing lettering (it removed a date badge and ignored two wording instructions); `gpt-image-2` did all three. `MAX_DAILY_CREDITS` (default 200) caps all visitors per UTC day; `0` turns generation off. Needs Redis.
- **Packs and margins:** `STRIPE.md` §6. Free 1 · Starter 10/$15 · Team 50/$59 · Agency 200/$199.
- **Failures auto-refund** the visitor — but you still paid Anthropic if the model ran. Watch `analysis.failed`.

### When something breaks

Vercel Logs carry one JSON line per event: `analysis.*`, `generation.*`, `billing.*`, `ratelimit.blocked`, `credits.ceiling`.

| What people see | Fix |
|---|---|
| "Live analysis is off on this deployment" | Set `ANTHROPIC_API_KEY`, **redeploy**. If it's already set, see below. |
| "The analysis model is unavailable right now." | Key wrong/revoked, or Anthropic is down |
| "The analysis request was rejected upstream." | Spend limit or credits — Console → Billing |
| "The analysis model is busy." | Rate limit or tier cap — Console → Rate limits |
| "…until shared storage (Upstash Redis) is configured." | Connect Upstash |
| "Today's generation budget … is used up." | Raise `MAX_DAILY_CREDITS` or wait for midnight UTC |
| "…out of credits." | Top up Magic Hour |
| Anything about payments, checkout or the paywall | `STRIPE.md` §7 |

**Buyer support** — recovery codes, refunds, granting reviews by hand: `STRIPE.md` §7.

### ⬜ Open: "Live analysis is off" with the key apparently set

As of 2026-09-22 the live landing page says *"Live analysis is off on this deployment"*, so **nobody can run a review**, even though `ANTHROPIC_API_KEY` is listed on Production and Preview.

What the evidence rules out:

- **Not a stale build.** The same page renders the paywall UI, and the Stripe keys were added minutes before that deployment. It is the current build.
- **Not "Sensitive" blocking build-time access.** All eight vars are Sensitive, and `STRIPE_SECRET_KEY` reached the same build fine — `capabilities().paywall` came out true while `analysisAvailable` came out false.
- **Not the key itself.** The value in `.env.local` is 108 chars, `sk-ant-a…`, and successfully ran three reviews for the gallery build.

`capabilities()` is just `Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)` (`src/lib/capabilities.ts:9`), so the build is seeing an empty or absent value. Sensitive vars can't be read back, so it can't be confirmed from outside — but everything else is eliminated.

**Fix:** delete `ANTHROPIC_API_KEY` from Production and Preview in the Vercel dashboard, re-add it with the value from `.env.local`, then `vercel deploy --prod`. Confirm with:

```bash
curl -s https://2nd-look.vercel.app/ | grep -c "Live analysis is off"   # want 0
```

Also worth doing while you're in there: `MAGIC_HOUR_API_KEY` was added in the same sitting and may have the same problem. The generation panel only reveals it on a report page, which needs a working review first.

### Local development

```bash
npm install
cp .env.example .env.local     # fill in what you have
npm run dev                    # localhost:3000
npm run typecheck && npm run lint && npm test    # before pushing
```

Nothing is required to start. Without Upstash, state goes to `.data/` — delete it to reset (balances live in `.data/store/__counters.json`). Testing payments locally: `STRIPE.md` §8.

---

## Demo — what to screen-record

Record **one master session**, then cut four clips from it. The narration script is in `DEMO.md`; this is the shot list.

### Before you hit record

- Step 5 done ✅ — gallery is built; give the findings a read first (step 5 TODO).
- The master take runs **2 live reviews and 1 render** (~$0.50 of Claude + 5 Magic Hour credits), and a dry run doubles that. With the paywall on you only get **one** free review, so either record **before** setting `STRIPE_SECRET_KEY`, or buy a Starter pack in the sandbox first — otherwise the pricing sheet interrupts your second take.
- `MAX_DAILY_CREDITS` ≥ 50 so renders don't get refused mid-take.
- Browser at **1440×900**, bookmarks bar hidden, one window, no extensions visible, no notifications. Clean profile.
- Tabs pre-warmed: `/cases/starbucks-korea` and `/` (with the Morrow case tile ready).
- Do a full dry run first. The live review takes ~60s and a render ~20s — you'll cut both down in the edit, but you need clean footage on both sides of the wait.

### The master take (~5 min raw)

1. **Landing page, the game.** "Can you spot the issue?" — hover the creative, make a guess, reveal. *(This is the hook: it's interactive and free.)*
2. **The Tank Day case.** `/cases/starbucks-korea`, scroll past the creative to "What a competent reviewer must catch". Hold on the line that nothing is wrong with the picture.
3. **A live run.** Back on `/`, click the Morrow tile → **Run a second look**. Let the stages resolve on camera: precedent retrieval → calendar check → analysis.
4. **The report.** Hover the finding card so the region lights up on the creative. Show the precedent citation, the exact element named, and the **Dispute** button.
5. **Zero findings, submitted by hand.** The `control-*` cases are eval-only — they have no case page, so you build this one in the brief form. Upload `public/cases/control-kr-sweet-potato-latte.png` and fill in: Harbor Coffee Korea · *"Sweet potato season is back."* · Roasted Sweet Potato Latte · Korea · 2026-10-20 · social. Same fictional brand and same market as Tank Day, and it should come back clean. Show that "no findings" renders as a real answer, not an error, and is still not an approval. *(Skeptics look for exactly this.)*
   **Shoot this take first** — it's a live model call, so the clean result isn't guaranteed. If something does get flagged, read the finding and decide whether it's fair before re-shooting.
6. **Magic Hour.** Scroll to *Alternatives to consider*. Point out that renaming a product and moving a date can't be fixed by image editing, so those findings stay. Pick `flux-2-klein`, show the credit cost, click **Generate an alternative**.
7. **The request panel.** Camera stays on the dark request plate as it ticks `queued` → `rendering` → `complete`. Click the **curl** tab. Drag the before/after slider once. End on the **Alternative to consider** label and the **Powered by Magic Hour** badge.

### The four cuts

| | Length | Shots | Notes |
|---|---|---|---|
| **X** | 30–45s, 16:9 | 2 → 3 (sped 6×) → 4 | Hook in the first 2 seconds: the Tank Day line as a text overlay. Must read with sound off — burn in captions. Post the video natively, link in the first reply. |
| **LinkedIn** | 60–90s, 1:1 or 16:9 | 2 → 3 (sped) → 4 → 6 → 7 | Captions mandatory. Lead with the approval-chain framing from `LAUNCH_POST.md`, not the tech. End on the "it flags, people decide" beat. |
| **Reddit** | 15–25s **silent GIF/clip**, plus one still | 1, then 4 | No voiceover, no music, no logo card — it reads as an ad and gets downvoted. Lead with the game (shot 1) so people click to try it themselves. r/SideProject and r/marketing want different cuts: SideProject gets shot 7 (the API panel), marketing gets shot 4 (the finding). |
| **Hacker News** | no video | — | HN doesn't watch demos. Post the text, link the Tank Day case page directly. If you attach anything, make it a **still** of shot 5 (zero findings) and shot 7 (the curl payload) — the two things a skeptical reader wants to check. Be in the thread to answer "how is this not just an LLM prompt?" |

### The three frames that carry it

If an edit is running long, these are the ones to keep:

1. The creative that is visually fine, next to the name/date/slogan finding — **the whole thesis**.
2. The finding card with its precedent citation and Dispute button — **falsifiable, not vibes**.
3. The Magic Hour request payload with the curl tab open — **the part nobody else shows**.
