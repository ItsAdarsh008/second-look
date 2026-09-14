# Second Look — 90-second demo

Setup before recording: production deploy with real keys, `MAX_DAILY_CREDITS` comfortably above the demo's needs, the gallery built with `npm run cases:build -- --generate`, and two tabs open: `/cases/starbucks-korea` and `/`.

---

**0:00–0:15 — Open on `/cases/starbucks-korea`.**

> "In May, Starbucks Korea launched a tumbler called the Tank, on May 18, with the slogan 'Thwack it on the table.' May 18 is the anniversary of the Gwangju massacre, when the army sent tanks against protesters. The campaign was dead within hours and the CEO was fired. Look at the picture: nothing is wrong with it."

Scroll past the creative to "What a competent reviewer must catch".

**0:15–0:25 — The premise.**

> "Nobody in that approval chain was malicious. They didn't have the reference. Second Look reads the name, the words and the date against each market's history, not just the image."

**0:25–0:35 — Submit a live campaign.** Switch to `/`. Click the **Rising Sun rays** case chip (it types itself into the brief and drops onto the light table), then click **Run a second look**.

> "Here's an energy drink ad for Korea and China."

As the stages resolve, point at them:

> "It pulls documented incidents for these markets, checks the launch calendar, then Claude reads every element on its own and in combination."

**0:35–0:55 — The report.** The verdict and the finding card appear. Hover the card so the region lights up on the creative.

> "One high-severity finding. The rays behind the can read as the Rising Sun flag, a symbol of Japanese imperial rule in both markets. It cites a real precedent, it says exactly where the problem is, and it proposes a change. There's a dispute button, because a reviewer in the market is the real control."

*(If recording the Tank Day beat live instead, this is where the 15-day calendar strip with May 18 in solid red carries the moment. Say: "the date is the finding.")*

**0:55–1:15 — Generate an alternative.** Scroll to **Alternatives to consider**. Point at the two columns:

> "Image editing can fix what's in the picture. It can't rename a product or move a date, so those findings stay on screen."

Select **flux-2-klein** and point at the cost line. Click **Generate an alternative**.

> ▶ **THE MAGIC HOUR CALL FIRES HERE** — the click posts to `/api/generate`, which uploads the creative and calls `POST https://api.magichour.ai/v1/ai-image-editor`.

**1:15–1:30 — Land on the API panel.** Keep the camera on the dark request plate while the responses tick from `queued` to `rendering` to `complete`. Click the **curl** tab.

> "This is the exact request: the art-direction note Claude's findings compiled into, sent to Magic Hour's image editor. Same call, in curl or Node. Magic Hour turns a review note into something the team can react to in the meeting."

Drag the before/after slider once. End on the label **Alternative to consider**.

---

Backup if generation is slow: say "renders take about twenty seconds", then switch to the gallery case, which shows a pre-rendered alternative next to its request body.
