# Second Look — standing context

> Scope note: any `CLAUDE.md` in a parent directory (e.g. the Workbench baseline in `~/Downloads`) belongs to a different project and does not govern this repo. The spec below does.

**Product:** Second Look is a cultural pre-flight check for ad campaigns. A user submits a campaign (creative image, headline, body copy, product name, target market(s), launch date, channel). The app returns grounded cultural-risk findings, each citing real historical precedent, and then uses the Magic Hour API to generate alternative creative that addresses the visual findings.

**Founding case:** Starbucks Korea, May 2026 — a tumbler size called a "tank," launched on May 18 with the slogan "Thwack it on the table!" May 18 is the Gwangju Democratization Movement anniversary (1980, military tanks against protesters); "thwack" echoed the 1987 police account of Park Jong-chul's death under torture. The promotion was cancelled within hours and the CEO was fired. **This failure was entirely in the product name, the date, and the slogan — there was nothing wrong with any picture.** Any architecture that only analyzes images fails this case and is therefore wrong.

**Non-negotiable product rules:**
1. Never use the words "fixed," "safe," "cleared," or "approved" in UI copy. The tool flags and proposes; a human decides. Generated alternatives are labeled "alternative to consider."
2. Every finding must carry at least one concrete precedent or a specific stated reason. A finding with no grounding is a bug, not a low-confidence finding.
3. Findings must be falsifiable and specific: "the radiating rays behind the product read as the Rising Sun flag in Korean and Chinese markets" — not "imagery may be culturally insensitive."
4. The analyzer must be able to return zero findings, and the UI must make zero findings feel like a real answer, not a failure.
5. Show the Magic Hour request payload in the UI. Promoting that API is an explicit goal of this project.

**Engineering rules:** Zod schema at every boundary. No `any`. Server-only secrets, never `NEXT_PUBLIC_` for API keys. All external calls go through a typed client in `src/lib/clients/` with explicit error types — never raw `fetch` in a route handler or component.
