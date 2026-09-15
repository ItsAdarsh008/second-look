import { describe, expect, it } from "vitest";
import { CASES, EVAL_CASES } from "@/data/cases";
import { aggregate, diffRuns, erroredCase, scoreCase, type EvalRun } from "./eval";
import { CaseFixtureSchema } from "./schema";
import { copyFindingTank, finding, imageFindingRays, timingFinding } from "@/test/fixtures";

const tank = CASES.find((c) => c.slug === "starbucks-korea")!;
const control = EVAL_CASES.find((c) => c.kind === "control")!;

describe("case fixtures", () => {
  it("are schema-valid, keep controls out of the app, and give Tank Day zero image expectations", () => {
    for (const c of EVAL_CASES) expect(() => CaseFixtureSchema.parse(c), c.slug).not.toThrow();
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(8);
    expect(CASES[0].slug).toBe("starbucks-korea");
    // Controls stay in the eval set (false positives) but never appear in the app.
    expect(EVAL_CASES.filter((c) => c.kind === "control").length).toBeGreaterThanOrEqual(2);
    expect(CASES.some((c) => c.kind === "control")).toBe(false);
    expect(EVAL_CASES.filter((c) => c.kind === "synthetic-visual").length).toBeGreaterThanOrEqual(2);
    expect(tank.expected.some((e) => e.locusKind === "image")).toBe(false);
  });
});

describe("scoreCase", () => {
  it("matches on category + locus kind and counts the rest as unexpected", () => {
    const slogan = finding({ ...copyFindingTank, id: "f-slogan", severity: "moderate", locus: { kind: "copy", field: "headline", excerpt: "Thwack" } });
    const score = scoreCase(tank, [timingFinding, copyFindingTank, slogan, imageFindingRays]);
    expect(score.hits).toBe(3);
    expect(score.misses).toBe(0);
    expect(score.unexpected.map((u) => u.id)).toEqual(["f-rays"]);
    // The slogan was caught but rated below the expected "high".
    expect(score.expected[2]).toMatchObject({ hit: true, severityMet: false });
  });

  it("never matches one finding to two expectations", () => {
    const score = scoreCase(tank, [timingFinding, copyFindingTank]);
    expect(score.hits).toBe(2);
    expect(score.misses).toBe(1);
  });

  it("counts every control finding as a false positive", () => {
    const agg = aggregate([scoreCase(control, [imageFindingRays]), scoreCase(tank, [timingFinding]), erroredCase(control, "boom")]);
    expect(agg.controlFalsePositives).toBe(1);
    expect(agg.expectedTotal).toBe(3);
    expect(agg.hitsTotal).toBe(1);
    expect(agg.errors).toBe(1);
  });
});

describe("diffRuns", () => {
  it("labels regressions and improvements", () => {
    const base = { runAt: "a", model: "m", leaveOneOut: true, aggregate: aggregate([scoreCase(tank, [timingFinding])]), cases: [scoreCase(tank, [timingFinding])] } satisfies EvalRun;
    const next = { ...base, aggregate: aggregate([scoreCase(tank, [timingFinding, copyFindingTank])]), cases: [scoreCase(tank, [timingFinding, copyFindingTank])] } satisfies EvalRun;
    const lines = diffRuns(next, base).join("\n");
    expect(lines).toMatch(/Recall: 33% → 67% \(improvement\)/);
    expect(lines).toContain("starbucks-korea: hits 1 → 2");
  });
});
