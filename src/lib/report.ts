import { SEVERITIES, type CaseFixture, type Finding, type LocusKind, type Precedent, type RiskCategory, type Severity } from "./schema";

export const KIND_LABEL: Record<CaseFixture["kind"], string> = {
  "incident-reconstruction": "Real failure, rebuilt",
  "synthetic-visual": "Risk in the picture",
  "synthetic-language": "Risk in the words",
  control: "Control",
};

/** Gallery sections, in reading order. */
/**
 * Section order on /cases. The gallery renders these top to bottom, so this — not the order of
 * `CASES` — is what decides which case a visitor meets first. `CASES[0]` only picks which card
 * inside a group is drawn large.
 *
 * "The risk is in the picture" leads so the first case on the page is one whose finding is in the
 * image, and so carries a generated alternative and its Magic Hour request. The cost is that
 * "Real failures, rebuilt" — the reconstructions of campaigns that actually happened, and the
 * page's strongest claim to credibility — now comes second.
 */
export const CASE_GROUPS: { kind: CaseFixture["kind"]; title: string; description: string }[] = [
  {
    kind: "synthetic-visual",
    title: "The risk is in the picture",
    description: "The copy is clean. The problem is a symbol, colour or gesture in the image.",
  },
  {
    kind: "incident-reconstruction",
    title: "Real failures, rebuilt",
    description: "Documented campaigns reconstructed with fictional brands, so the analyzer can't recognize them by name.",
  },
  {
    kind: "synthetic-language",
    title: "The risk is in the words",
    description: "The image is clean. The problem is a product name or a slogan.",
  },
  {
    kind: "control",
    title: "Controls",
    description: "Ordinary campaigns for the same markets. A useful reviewer leaves these alone.",
  },
];

const WHERE: Record<LocusKind, string> = { image: "the image", copy: "the copy", timing: "the launch date", concept: "the idea" };

/**
 * "Should catch one risk, in the image" / "Should catch two risks, both in the copy" /
 * "Should catch three risks: two in the copy, one in the launch date" / "Should come back clean".
 */
export function expectationSummary(c: Pick<CaseFixture, "expected">): string {
  const total = c.expected.length;
  if (total === 0) return "Should come back clean";
  const counts = new Map<LocusKind, number>();
  for (const e of c.expected) counts.set(e.locusKind, (counts.get(e.locusKind) ?? 0) + 1);
  const head = `Should catch ${NUMBER_WORDS[total] ?? total} ${total === 1 ? "risk" : "risks"}`;
  if (counts.size === 1) {
    const [kind] = [...counts.keys()];
    return `${head}, ${total === 1 ? "" : total === 2 ? "both " : "all "}in ${WHERE[kind]}`;
  }
  return `${head}: ${[...counts.entries()].map(([kind, n]) => `${NUMBER_WORDS[n] ?? n} in ${WHERE[kind]}`).join(", ")}`;
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  moderate: "Moderate",
  low: "Low",
};

export const CATEGORY_LABEL: Record<RiskCategory, string> = {
  "historical-memory": "Historical memory",
  religious: "Religious",
  political: "Political",
  "racial-ethnic": "Racial and ethnic",
  "gender-sexuality": "Gender and sexuality",
  "caste-class": "Caste and class",
  "language-translation": "Language and translation",
  "gesture-symbol": "Gesture and symbol",
  "color-symbolism": "Color symbolism",
  numerology: "Numerology",
  "food-dietary": "Food and dietary",
  "national-symbol": "National symbol",
  "calendar-timing": "Calendar timing",
  "body-appearance": "Body and appearance",
};

export const PRECEDENT_KIND_LABEL: Record<Precedent["kind"], string> = {
  incident: "Documented incident",
  referent: "Historical referent",
  reasoning: "Reasoning only",
};

export function severityCounts(findings: readonly Finding[]): Record<Severity, number> {
  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<Severity, number>;
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/** Editorial style: spell out one through nine. Also sidesteps the display serif's "1", which reads as "l". */
function plural(n: number, one: string, many: string): string {
  return `${NUMBER_WORDS[n] ?? n} ${n === 1 ? one : many}`;
}

/**
 * One-line verdict written by rule from severities — never by the model.
 * Deliberately avoids words that imply sign-off.
 */
export function verdictLine(findings: readonly Finding[]): string {
  const c = severityCounts(findings);
  if (c.critical > 0) return `Hold this campaign for in-market review: ${plural(c.critical, "critical finding", "critical findings")}.`;
  if (c.high > 0) return `Revise before launch: ${plural(c.high, "high-severity finding", "high-severity findings")}.`;
  if (c.moderate + c.low > 0) return `Worth a local reviewer's read: ${plural(c.moderate + c.low, "minor finding", "minor findings")}.`;
  return "No cultural-referent risks found in what was checked.";
}

export const DISPUTE_NOTE =
  "Second Look is a first read, not a ruling. It reasons from a finite corpus of documented incidents and a partial calendar, and it can be wrong in both directions: it will flag readings locals would shrug at, and it will miss references it has never seen. The actual control is a reviewer who lives in the market. If you disagree with this finding, take it to them.";
