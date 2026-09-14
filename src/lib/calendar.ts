import { CALENDAR } from "@/data/calendar";
import type { CalendarEntry, CalendarHit, Gravity, Market } from "./schema";

const DAY_MS = 86_400_000;

const GRAVITY_ORDER: Record<Gravity, number> = {
  solemn: 0,
  contested: 1,
  "religious-observance": 2,
  celebratory: 3,
};

function utc(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** `MM-DD` in a given year, or null when it doesn't exist (Feb 29 in a common year). */
function monthDayIn(year: number, monthDay: string): number | null {
  const candidate = `${year}-${monthDay}`;
  const ms = utc(candidate);
  return Number.isNaN(ms) || iso(ms) !== candidate ? null : ms;
}

/** Signed distance in days from a span to a date: 0 inside, negative before start, positive after end. */
function offsetFromSpan(launch: number, start: number, end: number): number {
  if (launch < start) return Math.round((launch - start) / DAY_MS);
  if (launch > end) return Math.round((launch - end) / DAY_MS);
  return 0;
}

interface Occurrence {
  start: number;
  end: number;
  offset: number;
}

function nearestOccurrence(entry: CalendarEntry, launch: number): Occurrence | null {
  const year = new Date(launch).getUTCFullYear();
  const candidates: Occurrence[] = [];
  const rule = entry.dateRule;

  if (rule.type === "fixed") {
    for (const y of [year - 1, year, year + 1]) {
      const day = monthDayIn(y, rule.date);
      if (day !== null) candidates.push({ start: day, end: day, offset: offsetFromSpan(launch, day, day) });
    }
  } else if (rule.type === "range") {
    for (const y of [year - 1, year, year + 1]) {
      const start = monthDayIn(y, rule.start);
      const wraps = rule.end < rule.start;
      const end = monthDayIn(wraps ? y + 1 : y, rule.end);
      if (start !== null && end !== null) candidates.push({ start, end, offset: offsetFromSpan(launch, start, end) });
    }
  } else {
    for (const w of rule.approximate) {
      const start = utc(w.start);
      const end = utc(w.end);
      candidates.push({ start, end, offset: offsetFromSpan(launch, start, end) });
    }
  }

  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) => (Math.abs(c.offset) < Math.abs(best.offset) ? c : best));
}

/**
 * Sensitive periods a launch date falls in or near, for the given markets.
 * Variable-date observances are never reported with an exact offset: their
 * windows are estimates, so they come back with `daysOffset: null` and
 * `needsVerification: true`.
 */
export function checkCalendar(
  launchDate: string | undefined,
  markets: readonly Market[],
  windowDays = 7,
  calendar: readonly CalendarEntry[] = CALENDAR,
): CalendarHit[] {
  if (!launchDate) return [];
  const launch = utc(launchDate);
  if (Number.isNaN(launch)) return [];

  const hits: CalendarHit[] = [];
  for (const entry of calendar) {
    if (!markets.includes(entry.market)) continue;
    const occ = nearestOccurrence(entry, launch);
    if (!occ || Math.abs(occ.offset) > windowDays) continue;

    const variable = entry.dateRule.type === "variable";
    hits.push({
      entryId: entry.id,
      market: entry.market,
      label: entry.label,
      gravity: entry.gravity,
      guidance: entry.guidance,
      ...(entry.sourceUrl ? { sourceUrl: entry.sourceUrl } : {}),
      occurrence: { start: iso(occ.start), end: iso(occ.end) },
      daysOffset: variable ? null : occ.offset,
      needsVerification: variable,
      ...(entry.dateRule.type === "variable" ? { note: entry.dateRule.note } : {}),
    });
  }

  return hits.sort(
    (a, b) =>
      GRAVITY_ORDER[a.gravity] - GRAVITY_ORDER[b.gravity] ||
      Math.abs(a.daysOffset ?? windowDays) - Math.abs(b.daysOffset ?? windowDays),
  );
}

export function describeOffset(hit: CalendarHit): string {
  if (hit.daysOffset === null) return "estimated window — verify exact dates";
  if (hit.daysOffset === 0) return "launch falls on it";
  const n = Math.abs(hit.daysOffset);
  return hit.daysOffset < 0 ? `${n} day${n === 1 ? "" : "s"} before` : `${n} day${n === 1 ? "" : "s"} after`;
}

export function formatCalendarForPrompt(hits: readonly CalendarHit[], launchDate: string | undefined): string {
  if (!launchDate) return "(No launch date supplied — timing could not be checked.)";
  if (hits.length === 0) return `(No listed sensitive periods within 7 days of ${launchDate} in these markets. The list is not exhaustive.)`;
  return hits
    .map((h) =>
      [
        `- ${h.market} · ${h.label} [${h.gravity}] ${h.occurrence.start}${h.occurrence.end !== h.occurrence.start ? ` → ${h.occurrence.end}` : ""} — ${describeOffset(h)}`,
        `    Guidance: ${h.guidance}`,
        h.needsVerification ? `    Date note: ${h.note ?? "Variable date; verify."}` : null,
        h.sourceUrl ? `    Source: ${h.sourceUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
}
