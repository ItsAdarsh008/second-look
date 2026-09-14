import { INCIDENTS } from "@/data/incidents";
import type { CampaignInput, Incident } from "./schema";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const WEIGHT_MARKET = 10;
const WEIGHT_SIGNAL_WORD = 4;
const WEIGHT_SIGNAL_PHRASE = 6;
const WEIGHT_CATEGORY = 0.25;

const CJK = new RegExp("[\\u3040-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af]");
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/** Lowercase, strip diacritics and punctuation, collapse whitespace, light plural folding. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean)
    .map((t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t))
    .join(" ");
}

/** Every way a launch date is commonly written, so date signals like "may 18" or "5.18" match. */
export function dateTokens(isoDate: string | undefined): string[] {
  if (!isoDate) return [];
  const [, mm, dd] = isoDate.split("-");
  const m = Number(mm);
  const d = Number(dd);
  const month = MONTHS[m - 1];
  return [
    `${month} ${d}`,
    `${d} ${month}`,
    `${m}.${d}`,
    `${mm}-${dd}`,
    `${m}/${d}`,
    `${d}/${m}`,
    `${m}${dd}`,
    `${m}${d}`,
  ];
}

function campaignText(input: CampaignInput): { normalized: string; raw: string } {
  const raw = [
    input.productName,
    input.headline,
    input.bodyCopy,
    input.brandName ?? "",
    input.brandNotes ?? "",
    ...dateTokens(input.launchDate),
  ].join(" \n ");
  return { normalized: ` ${normalize(raw)} `, raw: raw.toLowerCase() };
}

export interface ScoredIncident {
  incident: Incident;
  score: number;
  marketOverlap: number;
  matchedSignals: string[];
}

export function scoreIncident(incident: Incident, input: CampaignInput): ScoredIncident {
  const text = campaignText(input);
  const marketOverlap = incident.markets.filter((m) => input.markets.includes(m)).length;

  const matchedSignals: string[] = [];
  let signalScore = 0;
  for (const signal of incident.signals) {
    if (CJK.test(signal)) {
      if (text.raw.includes(signal.toLowerCase())) {
        matchedSignals.push(signal);
        signalScore += WEIGHT_SIGNAL_PHRASE;
      }
      continue;
    }
    const needle = normalize(signal);
    if (!needle) continue;
    if (text.normalized.includes(` ${needle} `)) {
      matchedSignals.push(signal);
      signalScore += needle.includes(" ") ? WEIGHT_SIGNAL_PHRASE : WEIGHT_SIGNAL_WORD;
    }
  }

  const relevant = marketOverlap > 0 || matchedSignals.length > 0;
  const score = relevant
    ? marketOverlap * WEIGHT_MARKET + signalScore + incident.categories.length * WEIGHT_CATEGORY
    : 0;

  return { incident, score, marketOverlap, matchedSignals };
}

export interface RetrievalOptions {
  /** Leave-one-out for evals: exclude the incident a fixture reconstructs. */
  excludeIds?: readonly string[];
  corpus?: readonly Incident[];
}

/** Scored, ranked incidents. Pure: no network, no embeddings. */
export function rankIncidents(input: CampaignInput, limit = 12, options: RetrievalOptions = {}): ScoredIncident[] {
  const corpus = options.corpus ?? INCIDENTS;
  const exclude = new Set(options.excludeIds ?? []);
  return corpus
    .filter((i) => !exclude.has(i.id))
    .map((i) => scoreIncident(i, input))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.incident.year - a.incident.year)
    .slice(0, limit);
}

export function retrieveIncidents(input: CampaignInput, limit = 12, options: RetrievalOptions = {}): Incident[] {
  return rankIncidents(input, limit, options).map((s) => s.incident);
}

export function formatIncidentsForPrompt(incidents: readonly Incident[]): string {
  if (incidents.length === 0) return "(No corpus incidents matched this campaign's markets or wording.)";
  return incidents
    .map((i, n) =>
      [
        `[${n + 1}] id=${i.id} — ${i.brand}, "${i.title}" (${i.year}, ${i.region}) [${i.categories.join(", ")}]`,
        `    What happened: ${i.whatHappened}`,
        `    Why it landed: ${i.whyItLanded}`,
        `    Outcome: ${i.outcome}`,
        `    Source: ${i.sourceUrl}`,
      ].join("\n"),
    )
    .join("\n");
}
