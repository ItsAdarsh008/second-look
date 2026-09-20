# Deploying Second Look

Live: **https://second-look-neon.vercel.app** (Vercel project `adarsh-eeb5/second-look`)

---

## Already done

| | |
|---|---|
| Vercel project, connected to the repo | ✅ `second-look`, production alias `second-look-neon.vercel.app` |
| `ANTHROPIC_API_KEY`, `MAGIC_HOUR_API_KEY` | ✅ set on Production + Preview |
| Upstash Redis + Vercel Blob | ✅ connected, variables injected |
| `MAX_DAILY_CREDITS` | ✅ set |
| 300-second analyze route | ✅ deployed and running on the current plan |
| `typecheck` / `lint` / `test` / `build` | ✅ all green (100 tests, 21 routes) |
| Payments work committed | ✅ wallets, packs, Stripe checkout + webhook |

**The live site still predates the payments work** — `/api/wallet` 404s on it. The code is committed but not yet pushed, so step 1 is what makes production match the repo.

---

## Remaining steps

### 1. Push — *do this first*

```bash
git push
```

Pushing to `main` auto-deploys. Wait for the deployment to go green, then check `https://second-look-neon.vercel.app/api/wallet` returns JSON instead of a 404. Until this lands, nothing else on this list has any effect.

### 2. Anthropic — credits and a spend limit

In the [Claude Console](https://platform.claude.com):

1. **Settings → Billing** — load credits. One review costs **~$0.25** (Opus 5, high effort, ~16k max output). Plan at **$0.50** to absorb retries and cold caches.
   - Just you + testers: **$25** · 50 users: **$75** · 200 users: **$300** (assume ~3 reviews per person per month)
2. **Set a spend limit** just above that. Without one, a launch spike drains the balance. Users see *"The analysis request was rejected upstream."* when it trips.
3. Check your tier on the [Rate limits page](https://platform.claude.com/settings/limits). Start caps at **$500/month**; ask for more *before* launch, not after the 429s.

The app caps each visitor at **5 reviews an hour**, so one stranger costs at most ~$2.50/hour. The Console spend limit is your only real ceiling.

### 3. Stripe — optional, turns the paywall on

Skip this entirely and every review stays free and unlimited. If you do it, do it in a **sandbox** first.

1. **Sandbox:** account menu → create a [sandbox](https://docs.stripe.com/sandboxes).
2. **Restricted key:** Developers → API keys → Create restricted key, permission **Checkout Sessions: Write** only.
3. **Webhook:** Developers → Webhooks → Add destination
   - URL `https://second-look-neon.vercel.app/api/stripe/webhook`
   - Events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   - Copy the signing secret. **Not optional** — it's what credits buyers who close the tab.
4. **Branding:** Settings → Branding (name, icon, colours — what buyers see on Checkout).
5. **Vercel Pro** is required once you take real money; Hobby is non-commercial.

The Stripe CLI is installed. Run `! stripe login` in this session if you want to drive it from the terminal.

### 4. Two more environment variables

Vercel → Settings → Environment Variables. Mark both **Sensitive**.

| Variable | Value | Environment |
|---|---|---|
| `STRIPE_SECRET_KEY` | restricted key from step 3 | sandbox key → Preview, live key → Production |
| `STRIPE_WEBHOOK_SECRET` | that webhook's signing secret | each environment's own |

Optionally `NEXT_PUBLIC_SITE_URL` if you add a custom domain (Settings → Domains), so link previews point at it.

**Redeploy after any key change.** Whether reviews, generation and the paywall are on is baked in at build time.

### 5. Verify on the live URL

1. Landing page shows the first case on the light table with *"Can you spot the issue?"*. With Stripe on, the header shows **1 free** and *"Your first review is free."* sits by **Run a second look**.
2. **Run a real review** — upload an ad or open a case, click **Run a second look**. ~1 minute. *"Live analysis is off on this deployment"* means the key isn't set or you haven't redeployed.
3. **Generate an alternative** from *Alternatives to consider*; the request payload shows beside it.
4. **Share the report** — the `/a/<id>` link opens in a private window.
5. **Paywall** (sandbox): run a second review → pricing sheet opens. Buy Starter with `4242 4242 4242 4242`, any future expiry/CVC. You should see *"10 reviews added"* plus a recovery code, and the header reads **10 reviews left**. Stripe's webhook log shows a **200**. In a private window, restore the recovery code and confirm the balance follows.
6. **Link preview** — open `/opengraph-image`.

### 6. Pre-build the gallery — *do before recording the demo*

`src/data/cases/results/` is empty, so case pages have no pre-computed findings. This makes them render real results with zero API cost per view:

```bash
# needs ANTHROPIC_API_KEY + MAGIC_HOUR_API_KEY in .env.local
npm run cases:build -- --generate     # 3 reviews (~$1) + Magic Hour credits
git add src/data/cases/results public/cases/generated
git commit -m "Publish case study results" && git push
```

### 7. Calibrate the real cost (optional, ~$3)

```bash
npm run eval          # 9 reviews
```

Divide that day's Opus 5 spend by 9. If it's far off $0.25, revisit step 2's numbers.

### 8. Launch checklist

- [ ] Payments work pushed and deployed (step 1)
- [ ] Anthropic credits loaded, org + workspace spend limits set
- [ ] Gallery pre-built (step 6)
- [ ] `MAX_DAILY_CREDITS` set to what you'll spend on Magic Hour per UTC day, and the Magic Hour account holds at least that
- [ ] If charging: Vercel Pro, live keys in Production only, one real purchase made and refunded, live webhook delivering 200s
- [ ] Demo clips recorded (below) **before** you post

---

## Reference

### Money

- **Claude:** only "Run a second look" costs anything. The game, case pages and link previews are free to serve. ~$0.25/review; retry doubles it; worst case ~$1.
- **Magic Hour:** its own credits. `flux-2-klein` (default) 5/image, `gpt-image-2` 50, `nano-banana-2` 100. `MAX_DAILY_CREDITS` (default 200) caps all visitors per UTC day; `0` turns generation off. Needs Redis.
- **Packs:** Free 1 · Starter 10/$15 · Team 50/$59 · Agency 200/$199. Every review includes one alternative; extra alternatives cost one review. Free review is 1 per browser, 2 per network per 30 days. Edit `PACKS` in `src/lib/pricing.ts`.
- **Failures auto-refund** the visitor — but you still paid Anthropic if the model ran. Watch `analysis.failed`.

### When something breaks

Vercel Logs carry one JSON line per event: `analysis.*`, `generation.*`, `billing.*`, `ratelimit.blocked`, `credits.ceiling`.

| What people see | Fix |
|---|---|
| "Live analysis is off on this deployment" | Set `ANTHROPIC_API_KEY`, **redeploy** |
| "The analysis model is unavailable right now." | Key wrong/revoked, or Anthropic is down |
| "The analysis request was rejected upstream." | Spend limit or credits — Console → Billing |
| "The analysis model is busy." | Rate limit or tier cap — Console → Rate limits |
| "…until shared storage (Upstash Redis) is configured." | Connect Upstash |
| "Today's generation budget … is used up." | Raise `MAX_DAILY_CREDITS` or wait for midnight UTC |
| "…out of credits." | Top up Magic Hour |
| No header button after adding Stripe keys | Built before the keys existed — redeploy |
| "Payments are unavailable right now." | Stripe key/permission — check the `billing.checkout` log line |
| Paid but no reviews appeared | Webhook failing — fix it, then **Resend** the event (credited once however many times it arrives) |

**Support:** a buyer's recovery code is the checkout session's **client reference ID**. Refunds don't take reviews back — lower `wallet:<id>:reviews` in Upstash by hand. Granting reviews needs `wallet:<id>:purchased` > 0 too.

### Local development

```bash
npm install
cp .env.example .env.local     # fill in what you have
npm run dev                    # localhost:3000
npm run typecheck && npm run lint && npm test    # before pushing
```

Nothing is required to start. Without Upstash, state goes to `.data/` — delete it to reset (balances live in `.data/store/__counters.json`). For payments locally, use a **development sandbox** key and `stripe listen --forward-to localhost:3000/api/stripe/webhook`, which prints the `whsec_…` to use.

---

## Demo — what to screen-record

Record **one master session**, then cut four clips from it. The narration script is in `DEMO.md`; this is the shot list.

### Before you hit record

- Steps 1 and 6 done — the gallery must be pre-built or case pages look thin.
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
