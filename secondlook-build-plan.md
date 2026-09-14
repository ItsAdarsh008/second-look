# Second Look — Build Plan

A cultural pre-flight check for ad creative. Upload the ad, the copy, the market, and the launch date; get back grounded risk findings with historical precedent; then use **Magic Hour's API** to generate alternative creative that clears the flags.

**Target:** Next.js web app, deployable to Vercel. Public demo whose second job is showing off what Magic Hour's API can do.

---

## The premise (read this before prompting anything)

In May 2026, Starbucks Korea promoted a large tumbler size called a "tank" by declaring **May 18** "Tank Day," with the slogan "Thwack it on the table!" May 18 is the anniversary of the 1980 Gwangju Democratization Movement, where the military used tanks against pro-democracy protesters. "Thwack" echoed the notorious 1987 police statement about student activist Park Jong-chul, who died under torture — police claimed he collapsed after they "hit the desk with a thwack." Shinsegae cancelled the promotion within hours, fired the CEO, issued two apologies, and police opened an investigation.

Nobody in that approval chain was malicious. They just didn't have the reference. That's the gap.

**Three design consequences that follow from this, and that most of the prompts below enforce:**

1. **The unit of analysis is a campaign, not an image.** Image, headline, body copy, product name, launch date, market, channel. The Starbucks failure lived entirely in name + date + slogan.
2. **Dates are a first-class signal.** A launch calendar crossed against a market's memorial and anniversary calendar catches a whole class of failure that no vision model will ever see.
3. **The tool flags and proposes; a human decides.** Never ship UI that says "fixed." The Magic Hour step produces *alternative creative to consider*, and the report stays attached to it. An "auto-sanitize" tool is both wrong and, to anyone in the industry, obviously not credible.

---

## Architecture

```
Input: image + copy + product name + market(s) + launch date + channel
   │
   ├─► Retrieval: incident corpus filtered by market/category  ─┐
   ├─► Calendar: date-sensitivity check for target market     ─┤
   │                                                           ▼
   ├─► Vision + text analysis (Claude, structured output, grounded on above)
   │       └─► Finding[] { severity, category, locus, rationale, precedent[], fix_directive }
   │
   ├─► Prompt compiler: Finding[] → one Magic Hour edit instruction + per-finding variants
   │
   └─► Magic Hour: upload-urls → ai-image-editor → poll image-projects/{id} → downloads[]
           └─► Before/after, with the raw request payload shown on screen
```

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Zod · Vercel Blob (or S3) for uploads · Anthropic SDK · Magic Hour Node SDK (`magic-hour`) or raw fetch.

**Magic Hour endpoints used:**

| Purpose | Call |
|---|---|
| Get presigned upload URL | `POST https://api.magichour.ai/v1/files/upload-urls` → `{ items: [{ type: "image", extension: "png" }] }` → returns `upload_url`, `file_path`, `expires_at` |
| Upload | `PUT <upload_url>` with raw file bytes |
| Edit creative | `POST https://api.magichour.ai/v1/ai-image-editor` → `{ style: { prompt }, assets: { image_file_paths: [file_path] }, model, aspect_ratio, resolution, image_count }` → returns `{ id, credits_charged }` |
| Poll | `GET https://api.magichour.ai/v1/image-projects/{id}` → `status` ∈ `queued\|rendering\|complete\|error\|canceled`, `downloads[].url` |

Auth on all: `Authorization: Bearer $MAGIC_HOUR_API_KEY`.

---

# The prompts

Run these in order in Claude Code. Verify the checkpoint after each before moving on — the later prompts assume the earlier contracts hold.

---

## Prompt 0 — Project constitution

> Create a new directory `secondlook` and initialize a Next.js 15 project (App Router, TypeScript, Tailwind, ESLint, `src/` dir, no Turbopack flag). Then write a `CLAUDE.md` at the repo root containing the following as the standing context for all future work in this repo — do not paraphrase it, keep it as the spec:
>
> **Product:** Second Look is a cultural pre-flight check for ad campaigns. A user submits a campaign (creative image, headline, body copy, product name, target market(s), launch date, channel). The app returns grounded cultural-risk findings, each citing real historical precedent, and then uses the Magic Hour API to generate alternative creative that addresses the visual findings.
>
> **Founding case:** Starbucks Korea, May 2026 — a tumbler size called a "tank," launched on May 18 with the slogan "Thwack it on the table!" May 18 is the Gwangju Democratization Movement anniversary (1980, military tanks against protesters); "thwack" echoed the 1987 police account of Park Jong-chul's death under torture. The promotion was cancelled within hours and the CEO was fired. **This failure was entirely in the product name, the date, and the slogan — there was nothing wrong with any picture.** Any architecture that only analyzes images fails this case and is therefore wrong.
>
> **Non-negotiable product rules:**
> 1. Never use the words "fixed," "safe," "cleared," or "approved" in UI copy. The tool flags and proposes; a human decides. Generated alternatives are labeled "alternative to consider."
> 2. Every finding must carry at least one concrete precedent or a specific stated reason. A finding with no grounding is a bug, not a low-confidence finding.
> 3. Findings must be falsifiable and specific: "the radiating rays behind the product read as the Rising Sun flag in Korean and Chinese markets" — not "imagery may be culturally insensitive."
> 4. The analyzer must be able to return zero findings, and the UI must make zero findings feel like a real answer, not a failure.
> 5. Show the Magic Hour request payload in the UI. Promoting that API is an explicit goal of this project.
>
> **Engineering rules:** Zod schema at every boundary. No `any`. Server-only secrets, never `NEXT_PUBLIC_` for API keys. All external calls go through a typed client in `src/lib/clients/` with explicit error types — never raw `fetch` in a route handler or component.
>
> Also create `.env.example` with `ANTHROPIC_API_KEY`, `MAGIC_HOUR_API_KEY`, `BLOB_READ_WRITE_TOKEN`. Do not write any feature code yet.

**Checkpoint:** `npm run dev` boots. `CLAUDE.md` exists and reads correctly.

---

## Prompt 1 — Domain types and schemas

> Create `src/lib/schema.ts` with Zod schemas and inferred TypeScript types for the whole domain. No implementation, just contracts.
>
> - `Market`: ISO country/region code plus display name (`KR`/`South Korea`, `CN`, `IN`, `SA`, `US`, `MX`, `NG`, `JP`, `FR`, `DE`, `BR`, `ID`, `TR`, `ZA`, `EG`). Export the list as a const.
> - `CampaignInput`: `imageUrl`, `imageFilePath` (Magic Hour path, nullable), `headline`, `bodyCopy`, `productName`, `markets: Market[]`, `launchDate` (ISO date, optional), `channel` (enum: ooh, social, tv, print, in-store, digital-display), `brandNotes` (optional free text).
> - `RiskCategory` enum: `historical-memory`, `religious`, `political`, `racial-ethnic`, `gender-sexuality`, `caste-class`, `language-translation`, `gesture-symbol`, `color-symbolism`, `numerology`, `food-dietary`, `national-symbol`, `calendar-timing`, `body-appearance`.
> - `Locus` — where the risk lives: discriminated union of `{ kind: "image", bbox: [x,y,w,h] normalized 0-1, description }`, `{ kind: "copy", field: "headline"|"body"|"productName", excerpt }`, `{ kind: "timing", date, reason }`, `{ kind: "concept", description }`.
> - `Precedent`: `{ brand, year, market, summary, outcome, sourceUrl? }`.
> - `Finding`: `{ id, severity: "critical"|"high"|"moderate"|"low", category: RiskCategory, markets: Market[], locus: Locus, claim (one sentence, specific), rationale (2-4 sentences), precedents: Precedent[], confidence: 0-1, fixDirective (imperative sentence describing the change, e.g. "Replace the radiating ray pattern behind the cup with a flat gradient") }`.
> - `AnalysisResult`: `{ id, input, findings: Finding[], marketsAnalyzed, corpusHits: string[], analyzedAt, modelUsed }`.
> - `EditJob`: `{ id, analysisId, magicHourProjectId, prompt, model, status, creditsCharged, downloads: {url, expiresAt}[], error }`.
>
> Write Vitest tests in `src/lib/schema.test.ts` that assert a valid fixture parses and that each of these is rejected: a Finding with an empty `precedents` array, a `claim` longer than 200 chars, a bbox value outside 0–1, a confidence outside 0–1.

**Checkpoint:** `npx vitest run` green. The empty-precedents rejection is the one that matters — it's rule 2 enforced in the type system.

---

## Prompt 2 — The incident corpus

> Build the grounding corpus at `src/data/incidents.ts` — a typed array of real, documented advertising and brand cultural failures. Each entry: `{ id, brand, year, market: Market[], categories: RiskCategory[], whatHappened (2-3 sentences), whyItLanded (the specific cultural knowledge that was missing), outcome, signals: string[] (searchable trigger terms — e.g. ["tank", "May 18", "Gwangju", "military vehicle", "thwack"]), sourceUrl }`.
>
> Seed with at least 30 entries. Include at minimum: Starbucks Korea "Tank Day" (2026), Dolce & Gabbana chopsticks China (2018), Pepsi/Kendall Jenner (2017), H&M "coolest monkey in the jungle" (2018), Nivea "White is Purity" (2017), Dove body wash (2017), Burger King Vietnamese-food chopsticks NZ (2019), Intel "Superiority" (2007), Sony PSP white/black (2006), Heineken "lighter is better" (2018), Audi Chinese used-car bride ad (2017), Gap China map t-shirt (2018), Versace/Coach/Givenchy territory t-shirts (2019), Ford India Figo trunk (2013), Bloomingdale's spiked eggnog (2015), Peloton wife (2019), Adidas Boston "you survived" (2017), McDonald's Filet-O-Fish Portugal (2017), Zara "Love your curves" (2017), Balenciaga campaign (2022), airline and telecom campaigns that mistranslated. Also include several non-Western-brand failures so the corpus doesn't read as a US morality list.
>
> Then write `src/lib/retrieval.ts`:
> - `retrieveIncidents(input: CampaignInput, limit = 12): Incident[]` — score each incident by market overlap (heaviest weight), then token overlap between the campaign's copy/product name and the incident's `signals`, then category breadth. Return the top N. Pure function, no network, no embeddings.
> - Export `formatIncidentsForPrompt(incidents): string` producing a compact, numbered block for the system prompt.
>
> Test: a campaign with `market: ["KR"]`, `productName: "Tank"`, `launchDate: "2026-05-18"` must surface the Starbucks Korea incident in the top 3.

**Checkpoint:** That retrieval test passes. If it doesn't, the `signals` on the Starbucks entry are too thin — fix the data, not the scoring.

---

## Prompt 3 — The date sensitivity layer

> Create `src/data/calendar.ts` and `src/lib/calendar.ts`. This is the layer that catches the Starbucks-class failure.
>
> Data: for each supported Market, a list of date-sensitive periods — `{ market, label, dateRule (fixed MM-DD | lunar/variable with a note | date range), gravity: "solemn"|"contested"|"celebratory"|"religious-observance", guidance (what advertisers should avoid or consider during it), sourceUrl? }`. Include memorial and mourning days, independence and liberation days, contested anniversaries, major religious observances (including variable-date ones like Ramadan, Diwali, Lunar New Year, Easter, Obon — mark these as `variable` with a note rather than guessing exact future dates), and national days of remembrance. For KR include May 18 (Gwangju), March 1, June 6 Memorial Day, August 15 Liberation Day, April 16 (Sewol).
>
> `checkCalendar(launchDate, markets, windowDays = 7)` returns any sensitive periods the launch date falls in or near, with days-offset. Variable-date observances return a `needsVerification: true` flag rather than a false precision.
>
> Test: `checkCalendar("2026-05-18", ["KR"])` returns the Gwangju entry with `gravity: "solemn"` and offset 0.

**Checkpoint:** The Gwangju test passes. Also verify the variable-date entries never return a confident exact match — a tool that confidently gets Ramadan's dates wrong is worse than one that says "verify."

---

## Prompt 4 — The analysis engine

> Build `src/lib/analyze.ts` using the Anthropic SDK (`@anthropic-ai/sdk`) with a vision message and tool-use for structured output.
>
> `analyzeCampaign(input: CampaignInput): Promise<AnalysisResult>`:
> 1. Call `retrieveIncidents` and `checkCalendar` first.
> 2. Build a system prompt in `src/lib/prompts/analyst.ts` that: sets the role as a cross-cultural creative reviewer briefing a brand team pre-launch; supplies the retrieved incidents and calendar hits as reference material, explicitly labeled as *reference, not a checklist* — the model must reason beyond them; instructs it to examine image, headline, body copy, product name, launch date, and channel **separately and then in combination**, because the highest-severity failures come from combinations (a benign word plus a specific date plus a specific market); requires each finding to name the exact element and the exact cultural referent; and explicitly permits returning zero findings.
> 3. Anti-patterns to forbid in the prompt, with examples: vague hedging ("some audiences may find"), flagging generic diversity/representation as a cultural risk, flagging anything the model cannot name a referent for, and inventing precedents. If it cannot cite a real incident it must say the grounding is reasoning-only and lower confidence accordingly.
> 4. Force output through a tool definition matching the `Finding` schema exactly. Validate with Zod; on validation failure, retry once with the error appended, then throw a typed `AnalysisError`.
> 5. Sort findings by severity then confidence.
>
> Use `claude-opus-4-5` (or the current strongest vision model available — check the SDK) and set a generous `max_tokens`. Do NOT stream; this is a single structured call.
>
> Add `src/lib/analyze.test.ts` with mocked SDK responses covering: valid output, schema-invalid output triggering retry, zero findings, and API error.

**Checkpoint:** Run it once for real against the Starbucks case (see Prompt 10 fixtures). It should produce a `calendar-timing` critical finding on May 18 and a `historical-memory` finding on "tank." If it only flags the image, your prompt is not weighting the non-visual inputs — fix that now, before building UI on top of it.

---

## Prompt 5 — Magic Hour client

> Create `src/lib/clients/magicHour.ts` — a fully typed client, no SDK dependency, raw `fetch` with Zod-validated responses. Read the current API reference at https://docs.magichour.ai before writing it and correct anything below that has changed.
>
> - `getUploadUrl(extension: "png"|"jpg"|"jpeg"|"webp")` → `POST /v1/files/upload-urls` with `{ items: [{ type: "image", extension }] }`, returns `{ uploadUrl, filePath, expiresAt }`.
> - `uploadImage(uploadUrl, bytes: Buffer, contentType)` → `PUT` the raw bytes to the presigned URL. No auth header on this call.
> - `editImage({ prompt, imageFilePaths, model, aspectRatio, resolution, imageCount })` → `POST /v1/ai-image-editor`, returns `{ id, creditsCharged }`.
> - `getImageProject(id)` → `GET /v1/image-projects/{id}`, returns status, `downloads[]`, `creditsCharged`, `error`.
> - `pollUntilComplete(id, { intervalMs = 2500, timeoutMs = 180_000, onTick })` → polls with jitter, resolves on `complete`, throws typed errors on `error`/`canceled`/timeout.
>
> All calls use `Authorization: Bearer ${process.env.MAGIC_HOUR_API_KEY}`. Add `server-only` import at the top. Define a `MagicHourError` class with `status`, `code`, `body`. Handle 401/402/429 distinctly — 402 means out of credits and must surface a specific user-facing message.
>
> Then write `scripts/smoke-magichour.ts`: takes a local image path and a prompt, runs the full upload → edit → poll → download-URL flow, prints each step with timing and the credits charged. Runnable with `npx tsx scripts/smoke-magichour.ts ./fixtures/test.png "make the sky purple"`.

**Checkpoint:** Run the smoke script against a real key. You want to see actual timings and credit cost before designing loading states around them. Note the model list from the docs (`flux-2-klein`, `gpt-image-2`, `nano-banana-2`, etc.) and which one handles instructional edits best — test at least two.

---

## Prompt 6 — Prompt compiler

> Create `src/lib/compile-edit-prompt.ts`. This turns findings into Magic Hour instructions and is the part most likely to produce garbage output, so it gets its own module and its own tests.
>
> - `compileEditPrompt(findings: Finding[], input: CampaignInput): { prompt, addressed: Finding[], unaddressable: Finding[] }`
> - Only findings with `locus.kind === "image"` are addressable by image editing. Copy, timing, and concept findings go in `unaddressable` with a short explanation — **the UI must show these prominently rather than hide them**, because in the Starbucks case every single finding would have been unaddressable, and a tool that silently drops them is lying.
> - The compiled prompt must be: a single imperative paragraph; concrete about what changes and what must be preserved (brand colors, product, composition, logo placement, text legibility); and explicit that the edit is minimal and surgical, not a reimagining. Preserve-list comes from `brandNotes` plus sensible defaults.
> - Also emit `variantPrompts: { findingId, prompt }[]` so a user can address one finding at a time.
> - Cap the prompt at 1500 chars.
>
> Test with a fixture of 4 findings (2 image, 1 copy, 1 timing) and snapshot the output. Assert the copy and timing findings land in `unaddressable`. Assert the prompt contains no hedging language and no reference to the findings' severity labels.

**Checkpoint:** Read the snapshot output yourself. If it reads like a list of complaints rather than an art direction note, rewrite the compiler.

---

## Prompt 7 — API routes and job orchestration

> Build the server surface.
>
> - `POST /api/upload` — accepts a file via Vercel Blob client upload, validates type and size (max 10MB, image types only), returns the blob URL.
> - `POST /api/analyze` — body is `CampaignInput`; runs `analyzeCampaign`; persists the `AnalysisResult` to storage keyed by a nanoid; returns the result. Add a 60s `maxDuration` export.
> - `POST /api/generate` — body `{ analysisId, findingIds?, model? }`; fetches the analysis, compiles the prompt, uploads the source image to Magic Hour (fetch the blob, get upload URL, PUT), calls `editImage`, persists the `EditJob`, returns `{ jobId, magicHourProjectId, prompt, creditsCharged }` immediately without polling.
> - `GET /api/generate/[jobId]` — polls Magic Hour once, updates and returns the job. Client polls this.
> - `GET /api/analysis/[id]` — public read for shareable permalinks.
>
> Storage: use Vercel KV if available, otherwise a simple `src/lib/store.ts` interface with a filesystem/in-memory implementation behind it, so swapping later is one file.
>
> Rate limiting: `@upstash/ratelimit` or a simple in-memory sliding window — 5 analyses and 10 generations per IP per hour. Return 429 with a clear message. Also enforce a global daily credit ceiling read from `MAX_DAILY_CREDITS` and refuse generation past it with a distinct error code, so a viral demo can't drain the account.
>
> Every route: Zod-parse the body, typed error responses `{ error: { code, message } }`, never leak the raw upstream error.

**Checkpoint:** `curl` each route. Confirm the credit ceiling actually blocks. Confirm no API key appears in any response body or client bundle (`grep -r "mhk_" .next/static` should be empty).

---

## Prompt 8 — Input and report UI

> Build the main flow at `src/app/page.tsx` and components under `src/components/`.
>
> **Input:** drag-drop image with preview, then fields for product name, headline, body copy, market multi-select (with flags), launch date picker, channel select, brand notes. Make it feel like a brief, not a form — one column, generous spacing, the image preview large on the right. A "Load an example" control that populates real case studies (see Prompt 10).
>
> **Analyzing state:** show the actual pipeline stages as they'd occur — retrieving precedent, checking the market calendar, reading the creative, cross-referencing — with the retrieved incident titles and calendar hits appearing as they resolve. Do not use a generic spinner; the intermediate work is the product.
>
> **Report:** 
> - Header strip: counts by severity, markets analyzed, and a one-line verdict written by severity rule (not by the model).
> - Findings as cards, sorted by severity, color-coded by a restrained palette (critical = deep red, not alarm red). Each card: the claim as the headline, the locus rendered appropriately — image findings show the creative with the bbox highlighted on hover; copy findings show the excerpt inline-highlighted in the submitted copy; timing findings render a small calendar strip showing the launch date against the sensitive period — then rationale, then precedents as compact cited cards with source links, then the fix directive.
> - **Zero findings** gets a real designed state: what was checked, which incidents were compared against, and an explicit "this is not an approval" line.
> - Every card has a "dispute" affordance that does nothing but reveal a note explaining the tool's limits and that a human reviewer in-market is the actual control. Ship it; it's honest and it's the thing a brand team will care about.
>
> Design: editorial, high-contrast, serif display face for headings (Instrument Serif or similar via `next/font`), tight sans for body. Dark and light both supported. No emoji, no gradients, no glassmorphism.

**Checkpoint:** Run the Starbucks fixture end to end and look at the report. The timing finding should be visually the loudest thing on the page.

---

## Prompt 9 — Generation UI and the Magic Hour showcase

> Build the remediation half. This is the section that promotes the API, so it gets the most design attention.
>
> - A "Generate alternatives" panel below the report. It lists which findings the image edit can address and which it cannot, in two clearly separated columns, with the unaddressable ones stated plainly: "Requires a copy or scheduling change — image editing cannot resolve this."
> - Model picker exposing the Magic Hour models (`flux-2-klein`, `gpt-image-2`, `nano-banana-2`, default) with one-line descriptions, plus `image_count` (1/4) and resolution. Show the credit cost before the user commits.
> - **The API panel:** a live, syntax-highlighted view of the exact request being sent — the `POST /v1/ai-image-editor` body with the compiled prompt in it — plus a tab showing the equivalent `curl` and Node snippet, with a copy button. As the job runs, show the polling responses updating (`queued` → `rendering` → `complete`) with elapsed time. Attribute it clearly: "Generated with the Magic Hour API" with a link to docs.magichour.ai. This panel is a feature, not debug output — design it as such.
> - Results: before/after comparison with a draggable slider, plus a grid when `image_count > 1`. Each result labeled **"Alternative to consider"** with the analysis summary attached and a download button. A re-run control that lets the user amend the compiled prompt by hand and resubmit — showing that the prompt is editable is showing that the API is flexible.
> - Error states: out of credits, rate limited, timeout, generation error — each with its own copy and a retry where retry makes sense.

**Checkpoint:** Watch someone else use it. If they can't tell what Magic Hour did versus what Claude did, the attribution isn't strong enough.

---

## Prompt 10 — Case study gallery and evals (do these together)

> Two things that share the same fixture data.
>
> **Fixtures** — `src/data/cases/`, one file per case, each with a `CampaignInput` reconstruction and an `expected` block listing the findings a competent reviewer must catch (category + locus kind + minimum severity). Build at least 8, including:
> - Starbucks Korea "Tank Day" — product name "Tank", launch 2026-05-18, market KR, slogan "Thwack it on the table!" Expected: critical `calendar-timing` on the date, critical/high `historical-memory` on "tank", high `historical-memory` on the slogan. **This case has zero image findings and that is the point of including it.**
> - Two cases where the risk is purely visual (gesture, symbol, or color).
> - Two cases where the risk is purely a translation or product-name problem.
> - **At least two clean control cases** that should return zero findings — a competent ad for the same market. False positives are the failure mode that kills a tool like this, and without controls you won't see them.
>
> Use reconstructed or synthetic creative for the images, not scraped brand assets. Note this in the UI.
>
> **Eval harness** — `npm run eval` runs every fixture through `analyzeCampaign` and reports, per case: which expected findings were hit (matched on category + locus kind), which were missed, and how many unexpected findings appeared. Print an aggregate recall on expected findings and a false-positive count on controls. Write results to `evals/results-<timestamp>.json` and keep a `evals/baseline.json` to diff against, so prompt changes show as a regression or an improvement rather than a vibe.
>
> **Gallery** — `/cases` route rendering the fixtures as pre-computed case studies (run once, cache the results as JSON, don't burn API calls on page views). Each: the campaign as submitted, the findings, the generated alternative, and a short "what actually happened" note with sources. This page is the shareable artifact — it's what makes the demo spread. `/cases/starbucks-korea` is the lead.

**Checkpoint:** Look at the false-positive count on the control cases first, before recall. A tool that flags everything is useless and reviewers will spot it in thirty seconds. If controls are dirty, go back to the analyst prompt.

---

## Prompt 11 — Hardening

> Production pass.
>
> - Content safety: refuse uploads that are not plausibly advertising creative, and add a short server-side guard rejecting requests that try to use the analyzer as a general-purpose image describer. Handle the Anthropic API's own refusals gracefully.
> - Add `src/lib/logger.ts` with structured logging of every analysis and generation (no image bytes, no full copy — just ids, markets, finding counts, credits, latency).
> - Full error boundaries and a `not-found`. Every async surface has a loading and an error state.
> - Accessibility pass: keyboard navigation through findings, `aria-live` on the analysis progress, bbox highlights also expressed as text, contrast check on the severity palette, respect `prefers-reduced-motion` on the slider.
> - Mobile: the report and the before/after slider must both work at 375px. Test it.
> - `next/image` everywhere, OG image generation via `next/og` for `/cases/*` and shared analysis permalinks — the OG card should show the creative with the severity count, since that's what drives clicks.
> - `README.md`: what it is, the Starbucks premise in three sentences, architecture diagram, env setup, `npm run eval` instructions, and an explicit **Limitations** section — the corpus is finite, the model is not a substitute for in-market review, false negatives are expected, generated alternatives are drafts. Do not undersell the limitations; stating them well is what makes the rest credible.

**Checkpoint:** Lighthouse over 90 on the gallery page. Read the Limitations section aloud — if it sounds defensive rather than confident, rewrite it.

---

## Prompt 12 — Ship

> Deploy to Vercel. Set env vars, configure `maxDuration` on the analyze and generate routes, and add a `vercel.json` if cron or region pinning is needed. Verify the credit ceiling works in production. Then write two things:
>
> 1. `DEMO.md` — a 90-second walkthrough script: open on `/cases/starbucks-korea`, state the premise, submit a live campaign, narrate the report with the timing finding as the beat, generate an alternative, and land on the API panel showing the Magic Hour request. Mark the exact moment the Magic Hour call fires.
> 2. A short launch post draft (X/LinkedIn length) leading with the Starbucks case, not with the tech.

---

## Notes on where this will go wrong

**The analyst prompt is the whole product.** Prompts 4 and 10 are the ones to iterate on; everything else is plumbing you'll get right the first time. Budget accordingly — expect to spend more time on the analyst system prompt and the eval loop than on all the UI combined.

**False positives will be your problem, not false negatives.** A model asked to find cultural risk will find cultural risk. The control fixtures in Prompt 10 are the guardrail; add more of them than feels necessary.

**Resist scope creep toward "and it also checks brand guidelines."** The tool is one sharp thing.

**On the Magic Hour framing:** the honest positioning is that Magic Hour handles the "now show me what the alternative looks like" half — turning a review note into a visual the team can actually react to in the meeting. That's a genuinely good use of an image-editing API and it's more compelling than claiming the API fixes the problem. Lead with that in the demo.

---

## Sources

- [Starbucks struggles to quell outrage over 'Tank Day' ad campaign that evoked massacre in South Korea — NBC News](https://www.nbcnews.com/world/asia/starbucks-tank-day-ad-campaign-south-korea-backlash-rcna346856)
- [South Korean Starbucks boss apologizes anew for ad campaign that evoked massacre — CBS News](https://www.cbsnews.com/news/south-korea-starbucks-apology-ad-campaign-massacre-memory/)
- [Starbucks Ad Mocks Gwangju Martyrs in South Korea — Foreign Policy](https://foreignpolicy.com/2026/06/09/starbucks-gwangju-far-right-south-korea/)
- [Magic Hour API Documentation](https://docs.magichour.ai/introduction)
- [Magic Hour — AI Image Editor endpoint](https://docs.magichour.ai/api-reference/image-projects/ai-image-editor)
- [Magic Hour — Generate asset upload URLs](https://docs.magichour.ai/api-reference/files/generate-asset-upload-urls)
- [Magic Hour — Get image details](https://docs.magichour.ai/api-reference/image-projects/get-image-details)
- [magichourhq/magic-hour-python](https://github.com/magichourhq/magic-hour-python)
