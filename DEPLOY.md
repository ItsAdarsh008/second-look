# Deploying Second Look

Two parts: **how much money to put into the Anthropic API** (the main running cost), then **the deploy itself** on Vercel.

Prices and limits below were checked against Anthropic's docs in September 2026. Check [the pricing page](https://platform.claude.com/docs/en/about-claude/pricing) before you buy credits; if a price has changed, the table in §1.3 scales with it.

---

## 1. Anthropic budget

### 1.1 What costs money

Only one thing in the app calls Claude: **running a review** ("Run a second look"). Everything else is free to serve:

- The **spot-the-issue game** on the landing page checks answers against a built-in key. No API calls.
- **Case study pages and the gallery** show results computed once and committed to the repo (`npm run cases:build`). No API calls on page views.
- **Link previews** (Open Graph images) are rendered by the server. No API calls.

So the Claude budget depends on **how many reviews people run**, not on how many people visit.

### 1.2 Cost of one review

Each review is one call to **Claude Opus 5** (`src/lib/analyze.ts`) with the ad image, the brief, up to 12 matched precedent incidents and any calendar hits. It uses adaptive thinking at `high` effort and allows up to 16,000 output tokens. The fixed instructions (system prompt and tool schema) are prompt-cached.

Opus 5 pricing: **$5 per million input tokens, $25 per million output tokens**. Cache writes cost $6.25 per million and cache reads $0.50 per million. Thinking is billed as output.

| Part of the request | Tokens (estimated) | Cost |
|---|---|---|
| Cached instructions (system prompt, tool schema, tool-use overhead) | ~4,000 | $0.002 if the cache is warm (another review in the last 5 min), $0.025 if cold |
| Campaign brief (precedents, calendar hits, copy) | 1,100–4,400 | $0.006–$0.022 |
| The image (`⌈w/28⌉ × ⌈h/28⌉` tokens; the app caps it at 1568px) | 1,500–3,100 | $0.008–$0.016 |
| **Output: thinking plus the findings JSON** | 4,000–11,000 typical, 16,000 max | **$0.10–$0.28** typical, $0.40 max |
| **One review** | | **about $0.20–$0.25 typical** |

Output is almost all of the cost, and thinking is the part that varies.

- **Retry:** if the model's answer fails validation, the app retries once (`MAX_ATTEMPTS = 2`), which roughly doubles that review's cost. Worst case is about $1 per review, and it should be rare.
- **Refusal:** if Opus 5 declines a request, a server-side fallback reruns it on another model. A decline before any output isn't billed.
- **Wrong upload:** a review that comes back "this doesn't look like an ad" still costs a call, because the model makes that judgement.

**Plan with $0.50 per review.** That's double the typical cost and leaves room for heavy-thinking reviews, cold caches and retries.

The token counts above are estimates: the app's prompt sizes were measured, but thinking length wasn't. Calibrate after deploying (§2.6); it costs about $3.

### 1.3 How much to load, by expected users

Assume each person who runs reviews does about **3 a month**: they run one, adjust the brief or the ad, and run it again. Visitors who only play the game or read the cases cost nothing. If your users behave differently, the formula is:

> **monthly budget = people running reviews × reviews each × $0.50**

| People running reviews per month | Reviews per month | Expected spend (~$0.25 each) | Load this (at $0.50 each) | Anthropic tier you need |
|---|---|---|---|---|
| Just you and testers (≤10), plus evals | ~40 | ~$10 | **$25** | Start |
| 50 | 150 | ~$38 | **$75** | Start |
| 200 | 600 | ~$150 | **$300** | Start |
| 500 | 1,500 | ~$375 | **$750** | Build (Start caps spend at $500 a month) |
| 1,000 | 3,000 | ~$750 | **$1,500** | Scale (Build caps spend at $1,000 a month) |
| 5,000 | 15,000 | ~$3,750 | **$7,500** | Scale |

**Launch spike:** a public launch (Hacker News, Product Hunt, a viral post) can put a month of traffic into one day. The app limits each visitor to **5 reviews an hour** (`src/lib/limits.ts`). That caps one visitor at about $2.50 an hour at the planning rate. It does **not** cap total spend, so the Console spend limit in §1.4 is your real ceiling.

**How to load it:** buy credits for one or two months at a time rather than a year up front. Topping up takes a minute, and after the first month you'll have real numbers. If you turn on auto-reload in the Console, set the spend limit in §1.4 at the same time, so an automatic top-up can't fund a runaway month.

### 1.4 Spend limits and tiers

Anthropic places your organization on a **usage tier** automatically, based on account history. Each tier has a **monthly spend cap**; when you hit it, API calls stop until the 1st of the next month:

| Tier | Monthly spend cap | Opus 5 rate limits |
|---|---|---|
| Start | $500 | 1,000 requests, 2M input and 400k output tokens per minute |
| Build | $1,000 | 5,000 requests, 5M input and 1M output tokens per minute |
| Scale | $200,000 | 10,000 requests, 10M input and 2M output tokens per minute |

- **Throughput isn't the bottleneck.** Even Start's 400,000 output tokens a minute covers roughly 50 reviews finishing every minute. What you'll hit first is the **spend cap**.
- **New accounts may start lower.** A brand-new organization can begin in an *Evaluation* tier with lower limits until it has some history. Don't launch publicly from a day-old account; use it for a week first, or request higher limits.
- **Asking for more:** if your row in §1.3 needs a higher tier, use **Request rate limit increase** on the [Rate limits page](https://platform.claude.com/settings/limits) before launch, not after the 429s start.

**Always set your own spend limit** under **Settings → Billing → Spend limits**, a little above your monthly budget from §1.3. When it's reached, reviews stop instead of draining your balance. Users see "The analysis request was rejected upstream." (at the tier's cap it's "The analysis model is busy."), so if those messages start appearing, check the Console before anything else. Better still, give Second Look its own **workspace** in the Console, with its own API key and a **workspace spend limit**, so this app can't use up credits meant for anything else.

### 1.5 Where the money goes, and how to spend less

- **Watch it:** [Console → Usage](https://platform.claude.com/usage) shows spend by model and day. Vercel's logs have one `analysis.completed` line per review and a `ratelimit.blocked` line whenever the per-visitor limit trips.
- **The biggest lever is effort.** The analyzer runs Opus 5 at `effort: "high"` (`src/lib/analyze.ts`). Dropping to `"medium"` usually cuts thinking tokens substantially, and thinking is most of the bill. Only do it after running `npm run eval` at both settings and confirming the catch rate and false positives hold.
- **Caching is already on.** The ~4,000-token instructions are cached for 5 minutes. With steady traffic nearly every review reads the cache; with sparse traffic, most reviews pay the ~$0.02 write.

### 1.6 Magic Hour (image alternatives)

Generating alternative creative is billed by **Magic Hour**, separately from Anthropic. The app caps it with `MAX_DAILY_CREDITS`, a global Magic Hour credit budget per UTC day, and refuses generations past it. It only works with Upstash Redis configured (§2.2). Size it the same way: generations per day × credits per image for your model.

---

## 2. Deploy

### 2.1 Accounts

- GitHub, with this repo pushed
- [Vercel](https://vercel.com). The Hobby plan runs the app (the review route needs 300 seconds, which Hobby allows), but Hobby is for non-commercial use; use Pro if this is a business.
- [Claude Console](https://platform.claude.com) for the Anthropic API key and credits
- [Magic Hour](https://magichour.ai/developer), optional, for generated alternatives

### 2.2 Anthropic setup

1. In the Claude Console, create a workspace (for example "Second Look").
2. Create an **API key in that workspace**. You'll paste it into Vercel.
3. **Settings → Billing:** buy the amount from §1.3.
4. Set an organization spend limit, plus a workspace spend limit for "Second Look" (§1.4).
5. Check your tier on the [Rate limits page](https://platform.claude.com/settings/limits). If §1.3 says you need more, request it now.

### 2.3 Vercel project

1. **Add New → Project**, import the repo. Framework preset: **Next.js**. Build and output settings stay at their defaults.
2. Under **Storage** (the Marketplace), add:
   - **Upstash Redis.** Required in production: it stores reviews (so shared report links work), the per-visitor rate limits and the Magic Hour credit ceiling. Serverless instances don't share memory or disk, so without it none of these hold.
   - **Vercel Blob.** Required for uploads: people's own ads are stored there.

   Both inject their environment variables automatically.

### 2.4 Environment variables

In **Settings → Environment Variables** (Production, and Preview if you want previews to work):

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | The workspace key from §2.2 |
| `MAGIC_HOUR_API_KEY` | Optional; leave unset to hide generation |
| `MAX_DAILY_CREDITS` | Magic Hour credits per UTC day. `0` disables generation. |
| `NEXT_PUBLIC_SITE_URL` | Your custom domain, e.g. `https://secondlook.example`. Optional: without it, link previews use Vercel's production domain. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Set by the Upstash integration (`KV_REST_API_*` also work) |
| `BLOB_READ_WRITE_TOKEN` | Set by the Blob integration |

Keys are server-only; none of them use the `NEXT_PUBLIC_` prefix except the site URL.

**Redeploy after changing any key.** The home page is built statically, so whether reviews and generation are switched on is decided at build time.

### 2.5 Deploy and check

1. Deploy (push to `main`, or **Redeploy** in Vercel).
2. Open the site. The first example case should be on the table with "Can you spot the issue?".
3. **Run a real review:** upload an ad, or open a case, and click **Run a second look**. It takes about a minute. If the button says "Live analysis is off on this deployment", the key isn't set or you haven't redeployed since setting it.
4. **Check the link preview:** paste your URL into a chat app, or open `/opengraph-image`. You should see the light-table card.
5. In the Console **Usage** page, confirm the review shows up and note its cost.

### 2.6 Calibrate the budget (about $3)

The per-review cost in §1.2 is an estimate. Measure it once with real traffic:

```bash
# with ANTHROPIC_API_KEY in .env.local
npm run eval                 # 9 test cases → 9 reviews, about $2–5
```

Then divide that day's Opus 5 spend on the Console Usage page by 9. That's your real cost per review. Put it in place of $0.25 in §1.3, keep the 2× safety margin, and adjust your credits and spend limit.

### 2.7 Pre-computed gallery (optional, recommended)

So case pages show real findings without spending anything on page views:

```bash
npm run cases:build -- --generate   # 3 reviews (~$1) plus Magic Hour credits for alternatives
git add src/data/cases/results public/cases/generated
git commit -m "Publish case study results" && git push
```

### 2.8 Before a public launch

- [ ] Spend limits set, organization and workspace (§1.4)
- [ ] Credits loaded for your expected month (§1.3), and the tier covers it
- [ ] Upstash and Blob connected, and a review works end to end on the live URL
- [ ] `MAX_DAILY_CREDITS` set to what you're willing to spend on Magic Hour per day
- [ ] You know where to look: Console **Usage** for spend, Vercel **Logs** for `analysis.failed` and `ratelimit.blocked`
