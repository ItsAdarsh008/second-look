import { z } from "zod";
import {
  CaseFixtureSchema,
  RiskCategorySchema,
  SEVERITY_RANK,
  SeveritySchema,
  type CaseFixture,
  type ExpectedFinding,
  type Finding,
  type LocusKind,
  type RiskCategory,
  type Severity,
} from "./schema";

/** Pure scoring for the eval harness: expected findings are matched on category + locus kind. */

export interface ExpectedOutcome {
  description: string;
  categories: RiskCategory[];
  locusKind: LocusKind;
  minSeverity: Severity;
  hit: boolean;
  matchedFindingId: string | null;
  matchedSeverity: Severity | null;
  severityMet: boolean;
}

export interface UnexpectedFinding {
  id: string;
  category: RiskCategory;
  locusKind: LocusKind;
  severity: Severity;
  claim: string;
}

export interface CaseScore {
  slug: string;
  kind: CaseFixture["kind"];
  expected: ExpectedOutcome[];
  unexpected: UnexpectedFinding[];
  hits: number;
  misses: number;
  findings: number;
  latencyMs: number;
  error: string | null;
}

function matchesExpectation(e: ExpectedFinding, f: Finding): boolean {
  return e.categories.includes(f.category) && f.locus.kind === e.locusKind;
}

export function scoreCase(fixture: CaseFixture, findings: readonly Finding[], latencyMs = 0): CaseScore {
  const used = new Set<string>();
  const expected: ExpectedOutcome[] = fixture.expected.map((e) => {
    const match = findings
      .filter((f) => !used.has(f.id) && matchesExpectation(e, f))
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])[0];
    if (match) used.add(match.id);
    return {
      description: e.description,
      categories: e.categories,
      locusKind: e.locusKind,
      minSeverity: e.minSeverity,
      hit: Boolean(match),
      matchedFindingId: match?.id ?? null,
      matchedSeverity: match?.severity ?? null,
      severityMet: match ? SEVERITY_RANK[match.severity] <= SEVERITY_RANK[e.minSeverity] : false,
    };
  });

  const unexpected = findings
    .filter((f) => !used.has(f.id))
    .map((f) => ({ id: f.id, category: f.category, locusKind: f.locus.kind, severity: f.severity, claim: f.claim }));

  const hits = expected.filter((e) => e.hit).length;
  return {
    slug: fixture.slug,
    kind: fixture.kind,
    expected,
    unexpected,
    hits,
    misses: expected.length - hits,
    findings: findings.length,
    latencyMs,
    error: null,
  };
}

export function erroredCase(fixture: CaseFixture, error: string): CaseScore {
  return {
    slug: fixture.slug,
    kind: fixture.kind,
    expected: fixture.expected.map((e) => ({
      description: e.description,
      categories: e.categories,
      locusKind: e.locusKind,
      minSeverity: e.minSeverity,
      hit: false,
      matchedFindingId: null,
      matchedSeverity: null,
      severityMet: false,
    })),
    unexpected: [],
    hits: 0,
    misses: fixture.expected.length,
    findings: 0,
    latencyMs: 0,
    error,
  };
}

export interface Aggregate {
  cases: number;
  errors: number;
  expectedTotal: number;
  hitsTotal: number;
  severityMetTotal: number;
  recall: number;
  controlCases: number;
  /** Every finding on a control case is a false positive. */
  controlFalsePositives: number;
  controlFalsePositivesModeratePlus: number;
  unexpectedOnNonControls: number;
}

export function aggregate(scores: readonly CaseScore[]): Aggregate {
  const controls = scores.filter((s) => s.kind === "control");
  const nonControls = scores.filter((s) => s.kind !== "control");
  const expectedTotal = nonControls.reduce((n, s) => n + s.expected.length, 0);
  const hitsTotal = nonControls.reduce((n, s) => n + s.hits, 0);
  return {
    cases: scores.length,
    errors: scores.filter((s) => s.error).length,
    expectedTotal,
    hitsTotal,
    severityMetTotal: nonControls.reduce((n, s) => n + s.expected.filter((e) => e.severityMet).length, 0),
    recall: expectedTotal === 0 ? 0 : hitsTotal / expectedTotal,
    controlCases: controls.length,
    controlFalsePositives: controls.reduce((n, s) => n + s.unexpected.length, 0),
    controlFalsePositivesModeratePlus: controls.reduce(
      (n, s) => n + s.unexpected.filter((u) => SEVERITY_RANK[u.severity] <= SEVERITY_RANK.moderate).length,
      0,
    ),
    unexpectedOnNonControls: nonControls.reduce((n, s) => n + s.unexpected.length, 0),
  };
}

const LocusKindSchema = z.enum(["image", "copy", "timing", "concept"]);

const CaseScoreSchema: z.ZodType<CaseScore> = z.object({
  slug: z.string(),
  kind: CaseFixtureSchema.shape.kind,
  expected: z.array(
    z.object({
      description: z.string(),
      categories: z.array(RiskCategorySchema),
      locusKind: LocusKindSchema,
      minSeverity: SeveritySchema,
      hit: z.boolean(),
      matchedFindingId: z.string().nullable(),
      matchedSeverity: SeveritySchema.nullable(),
      severityMet: z.boolean(),
    }),
  ),
  unexpected: z.array(
    z.object({ id: z.string(), category: RiskCategorySchema, locusKind: LocusKindSchema, severity: SeveritySchema, claim: z.string() }),
  ),
  hits: z.number(),
  misses: z.number(),
  findings: z.number(),
  latencyMs: z.number(),
  error: z.string().nullable(),
});

export const EvalRunSchema = z.object({
  runAt: z.string(),
  model: z.string(),
  leaveOneOut: z.boolean(),
  aggregate: z.object({
    cases: z.number(),
    errors: z.number(),
    expectedTotal: z.number(),
    hitsTotal: z.number(),
    severityMetTotal: z.number(),
    recall: z.number(),
    controlCases: z.number(),
    controlFalsePositives: z.number(),
    controlFalsePositivesModeratePlus: z.number(),
    unexpectedOnNonControls: z.number(),
  }),
  cases: z.array(CaseScoreSchema),
});
export type EvalRun = z.infer<typeof EvalRunSchema>;

/** Human-readable regression/improvement lines versus a baseline run. */
export function diffRuns(current: EvalRun, baseline: EvalRun): string[] {
  const lines: string[] = [];
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  const dRecall = current.aggregate.recall - baseline.aggregate.recall;
  const dFp = current.aggregate.controlFalsePositives - baseline.aggregate.controlFalsePositives;
  lines.push(
    `False positives on controls: ${baseline.aggregate.controlFalsePositives} → ${current.aggregate.controlFalsePositives} ${dFp < 0 ? "(improvement)" : dFp > 0 ? "(REGRESSION)" : "(unchanged)"}`,
  );
  lines.push(
    `Recall: ${pct(baseline.aggregate.recall)} → ${pct(current.aggregate.recall)} ${dRecall > 0 ? "(improvement)" : dRecall < 0 ? "(REGRESSION)" : "(unchanged)"}`,
  );
  for (const c of current.cases) {
    const b = baseline.cases.find((x) => x.slug === c.slug);
    if (!b) continue;
    if (c.hits !== b.hits) lines.push(`  ${c.slug}: hits ${b.hits} → ${c.hits}`);
    if (c.unexpected.length !== b.unexpected.length) lines.push(`  ${c.slug}: unexpected ${b.unexpected.length} → ${c.unexpected.length}`);
  }
  return lines;
}
