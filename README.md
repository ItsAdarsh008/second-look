# Second Look

A cultural pre-flight check for ad campaigns. Drop in the ad and say where and when it runs: markets, launch date, channel, and optional brand notes. Second Look reads the image and the copy printed on it, returns cultural-risk findings each tied to a named referent and a documented precedent, then uses the [Magic Hour API](https://docs.magichour.ai) to render alternative creative for the findings that live in the picture.

The form doesn't ask for copy separately; the analyst reads it from the creative. Anything the image doesn't show (a social caption, a campaign or product name used elsewhere) belongs in the brand notes, or the analyst won't see it. Case studies still carry their own copy, shown read-only when a case is loaded, and the API accepts `productName`, `headline` and `bodyCopy` for callers that have them.

## Why it exists

In May 2026, Starbucks Korea promoted a tumbler size called the "tank" with a "Tank Day" on May 18 and the slogan "Thwack it on the table!". May 18 is the anniversary of the 1980 Gwangju massacre, where the military sent tanks against protesters, and "thwack" echoed the 1987 police account of a student activist's death under torture. The promotion was pulled within hours and the CEO was fired. Nothing was wrong with the picture: the failure lived entirely in a name, a date and a slogan.

So the unit of analysis is the campaign, not the image. Dates are a first-class signal. And the tool flags and proposes; people decide.

## How it works

```
Input: image + copy + product name + market(s) + launch date + channel
   │
   ├─► Retrieval: incident corpus ranked by market and wording      (src/lib/retrieval.ts, src/data/incidents.ts)
   ├─► Calendar: memorial, political and religious dates near launch (src/lib/calendar.ts, src/data/calendar.ts)
   │                                                                  ▼
   ├─► Analysis: Claude Opus 5, vision + one structured tool call, grounded on the above (src/lib/analyze.ts)
   │       └─► Finding[] { severity, category, markets, locus, claim, rationale, precedents[], confidence, fixDirective }
   │       └─► Server-side grounding: corpus URLs only, reasoning-only findings capped, markets restricted
   │
   ├─► Prompt compiler: image findings → one art-direction note + per-finding variants (src/lib/compile-edit-prompt.ts)
   │       └─► copy, timing and concept findings are returned as unaddressable and shown, never dropped
   │
   └─► Magic Hour: upload-urls → PUT → ai-image-editor → poll image-projects/{id} → downloads[]
           └─► before/after, with the exact request body, curl and Node shown on the page
```

| Layer | Where |
|---|---|
| Domain contracts (Zod) | `src/lib/schema.ts` |
| Analyst prompt | `src/lib/prompts/analyst.ts` |
| External clients (typed errors) | `src/lib/clients/` — `anthropic.ts`, `magicHour.ts`, `creative.ts`, `upstash.ts`, `blob.ts`, `secondlook.ts` (browser) |
| Storage, rate limits, credit ceiling | `src/lib/store.ts`, `src/lib/limits.ts` |
| API routes | `src/app/api/{analyze,analysis/[id],generate,generate/[jobId],upload,uploads/[name]}` |
| UI | `src/app/page.tsx`, `src/app/a/[id]` (shareable report), `src/app/cases` (gallery) |
| Fixtures and evals | `src/data/cases/`, `scripts/eval.ts`, `evals/` |

## Setup

Requires Node 20.12+ (developed on Node 24).

```bash
npm install
cp .env.example .env.local   # then fill in keys
npm run dev
```

| Variable | Needed for | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Analysis | Server-only. |
| `MAGIC_HOUR_API_KEY` | Generating alternatives | Server-only. Get one at magichour.ai. |
| `BLOB_READ_WRITE_TOKEN` | Uploads in production | Leave empty locally: uploads are stored under `.data/uploads`. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Production storage | Analyses, jobs, rate limits and the credit ceiling. Without it, local dev uses `.data/store`. On Vercel, generation stays disabled until Redis is configured, because a per-instance credit ceiling isn't a ceiling. `KV_REST_API_URL`/`KV_REST_API_TOKEN` also work. |
| `MAX_DAILY_CREDITS` | Generation | Global Magic Hour credit budget per UTC day. Defaults to 200. `0` disables generation. |

The app runs without any keys: the brief form, case gallery and API panel all render, and routes return typed `not_configured` errors.

## Scripts

```bash
npm test                  # vitest: schemas, retrieval, calendar, analyzer (mocked SDK), compiler, Magic Hour client, limits, evals
npm run typecheck
npm run lint

npm run eval              # run every fixture through the analyzer and score it (spends API calls)
npm run eval -- --case starbucks-korea
npm run eval -- --update-baseline

npm run cases:build                         # pre-compute gallery analyses (leave-one-out)
npm run cases:build -- --generate           # also render Magic Hour alternatives for image findings
npm run creative:render                     # re-render fixture SVGs to public/cases/*.png

npx tsx scripts/smoke-magichour.ts ./fixtures/test.png "make the sky purple" --model flux-2-klein
```

### Evals

`npm run eval` runs each case in `src/data/cases/` through `analyzeCampaign` and matches findings to the case's expectations on category and locus kind. It prints false positives on the control cases first, then recall on expected findings, and writes `evals/results-<timestamp>.json`. If `evals/baseline.json` exists, it prints the difference, so a prompt change reads as a regression or an improvement.

Evals run **leave-one-out**: each reconstruction's own incident is removed from the reference corpus, and reconstructions use fictional brands. The question is whether the tool would have caught Tank Day before May 2026, not whether it can look it up. The analyst system prompt contains no fixture case, and a test enforces that.

The fixtures include three control campaigns for the same markets as the risky cases. Look at those first: a tool that flags everything is useless.

## Deploying to Vercel

1. Import the repo. Framework preset: Next.js.
2. Add a Blob store and an Upstash Redis database from the Vercel Marketplace; their env vars are injected automatically.
3. Set `ANTHROPIC_API_KEY`, `MAGIC_HOUR_API_KEY` and `MAX_DAILY_CREDITS`.
4. `/api/analyze` declares `maxDuration = 300` (Fluid compute). A single Opus vision call with adaptive thinking may exceed the 60 seconds the original plan suggested.
5. Run `npm run cases:build -- --generate` locally with real keys, commit `src/data/cases/results/` and `public/cases/generated/`, and redeploy so the gallery shows real results without spending API calls on page views.

## Limitations

Second Look is a first read before launch. It isn't a verdict. Here is what it can't do.

- **Its knowledge is finite.** The reference corpus has 65 documented incidents, and retrieval matches markets and words, not meaning. A campaign that rhymes with a past failure without sharing its vocabulary won't retrieve it. The model fills part of that gap from its own knowledge, unevenly across markets.
- **The calendar is partial and national.** It holds 149 dated entries across 15 markets. Regional observances (Jeju, Bali, Okinawa) apply countrywide. Lunar and moon-sighted dates are estimates, always marked "verify locally".
- **False negatives are expected.** Slang, subcultures, fast-moving memes, local politics and anything after the model's training data are where it will miss. Silence from Second Look is not clearance.
- **False positives happen too.** The control cases exist to measure them. Run the eval before trusting a prompt change.
- **It covers 15 markets**, and it reviews each in the languages the copy is written in.
- **Generated images are drafts, not fixes.** Magic Hour edits pixels. It can't rename a product, rewrite a slogan or move a launch date, and it can alter details it was asked to preserve. Every alternative is labeled as one to consider, with the report attached.
- **Images are read at 1568px on the long edge.** Fine print in dense creative can be missed.
- **It is not legal, regulatory or brand-safety review.**

The control that matters is a person who lives in the market reading the campaign before it runs. Second Look is there so that person gets asked the right question in time.

## Notes on the build

- The landing page is the tool: a brief on the left and a "light table" on the right, where the creative is scanned and finding regions are drawn on. `/?case=<slug>` opens any case study in the tool.
- Motion (`motion/react`) drives the scroll reveals, report and generation animations; Lenis provides smooth scrolling. Both are disabled under `prefers-reduced-motion`. Above-the-fold entrances are plain CSS so they start at first paint. Nested scroll areas opt out of Lenis with `data-lenis-prevent`.
- The home page is statically rendered, so whether analysis and generation are enabled is decided from env vars at build time. After adding keys, rebuild (on Vercel, redeploy).
- Creative in the gallery is synthetic, drawn for this project with fictional brands. No brand assets are used.
- Markets appear as ISO code tags rather than flags. The design spec excludes emoji, and a cultural-review tool shouldn't hand-draw national flags.
- UI copy never says "fixed", "safe", "cleared" or "approved".
- `shadcn/ui` from the original plan isn't used; the interface is a small set of hand-built Tailwind components.
