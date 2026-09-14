import type { CalendarHit } from "./schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-05-18" → "May 18, 2026" without timezone drift. */
export function formatDate(iso: string, opts: { year?: boolean; long?: boolean } = {}): string {
  const [y, m, d] = iso.split("-").map(Number);
  const month = (opts.long ? MONTHS_LONG : MONTHS)[m - 1];
  return opts.year === false ? `${month} ${d}` : `${month} ${d}, ${y}`;
}

export function addDays(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function describeOffsetText(hit: CalendarHit): string {
  if (hit.daysOffset === null) return "near the estimated dates; verify locally";
  if (hit.daysOffset === 0) return "the launch falls on it";
  const n = Math.abs(hit.daysOffset);
  return `launch is ${n} day${n === 1 ? "" : "s"} ${hit.daysOffset < 0 ? "before" : "after"}`;
}

export function percent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
