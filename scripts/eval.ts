/**
 * Eval harness: runs every case fixture through analyzeCampaign and scores it.
 *
 *   npm run eval                        # all cases, leave-one-out retrieval
 *   npm run eval -- --case pajero       # one case
 *   npm run eval -- --full-corpus       # let retrieval see each case's own incident
 *   npm run eval -- --update-baseline   # save this run as evals/baseline.json
 *
 * Spends real Anthropic API calls (one per case, two on a retry).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ensureServerConditions, loadEnv } from "./lib/env";

async function main(): Promise<void> {
  if (ensureServerConditions()) return;
  loadEnv();

  const { CASES } = await import("../src/data/cases");
  const { analyzeCampaign, AnalysisError } = await import("../src/lib/analyze");
  const { ANALYST_MODEL } = await import("../src/lib/clients/anthropic");
  const { aggregate, diffRuns, erroredCase, scoreCase, EvalRunSchema } = await import("../src/lib/eval");

  const args = process.argv.slice(2);
  const only = args.includes("--case") ? args[args.indexOf("--case") + 1] : null;
  const leaveOneOut = !args.includes("--full-corpus");
  const concurrency = Number(args.includes("--concurrency") ? args[args.indexOf("--concurrency") + 1] : 3) || 3;

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to .env.local and run again.");
    process.exitCode = 1;
    return;
  }

  const cases = only ? CASES.filter((c) => c.slug === only) : CASES;
  if (cases.length === 0) {
    console.error(`No case "${only}". Cases: ${CASES.map((c) => c.slug).join(", ")}`);
    process.exitCode = 2;
    return;
  }

  console.log(`Second Look eval — ${cases.length} cases, model ${ANALYST_MODEL}, ${leaveOneOut ? "leave-one-out" : "full corpus"}\n`);

  const scores: ReturnType<typeof scoreCase>[] = new Array(cases.length);
  let next = 0;
  async function worker() {
    while (next < cases.length) {
      const i = next++;
      const c = cases[i];
      const started = Date.now();
      try {
        const result = await analyzeCampaign(c.input, { excludeIncidentIds: leaveOneOut ? c.ownIncidentIds : [] });
        scores[i] = scoreCase(c, result.findings, Date.now() - started);
      } catch (err) {
        const message = err instanceof AnalysisError ? `${err.code}: ${err.message}` : String(err);
        scores[i] = erroredCase(c, message);
      }
      const s = scores[i];
      console.log(`  done ${c.slug} (${(s.latencyMs / 1000).toFixed(1)}s)${s.error ? ` ERROR ${s.error}` : ""}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, worker));

  const agg = aggregate(scores);

  // Controls first: a tool that flags everything is useless, and this is where that shows.
  console.log("\nControls (every finding is a false positive)");
  for (const s of scores.filter((x) => x.kind === "control")) {
    console.log(`  ${s.slug.padEnd(34)} ${s.error ? "ERROR" : `${s.unexpected.length} findings`}`);
    for (const u of s.unexpected) console.log(`      ✗ [${u.severity}] ${u.category}/${u.locusKind}: ${u.claim}`);
  }

  console.log("\nCases with expected findings");
  for (const s of scores.filter((x) => x.kind !== "control")) {
    console.log(`  ${s.slug.padEnd(34)} ${s.error ? `ERROR ${s.error}` : `${s.hits}/${s.expected.length} hit, ${s.unexpected.length} unexpected`}`);
    for (const e of s.expected) {
      const sev = e.hit ? ` rated ${e.matchedSeverity}${e.severityMet ? "" : ` (expected ≥ ${e.minSeverity})`}` : "";
      console.log(`      ${e.hit ? "✓" : "✗"} ${e.categories[0]}/${e.locusKind}: ${e.description}${sev}`);
    }
    for (const u of s.unexpected) console.log(`      + [${u.severity}] ${u.category}/${u.locusKind}: ${u.claim}`);
  }

  console.log("\nAggregate");
  console.log(`  False positives on controls: ${agg.controlFalsePositives} across ${agg.controlCases} controls (${agg.controlFalsePositivesModeratePlus} moderate or worse)`);
  console.log(`  Recall on expected findings:  ${agg.hitsTotal}/${agg.expectedTotal} = ${(agg.recall * 100).toFixed(0)}%`);
  console.log(`  Severity at or above expected: ${agg.severityMetTotal}/${agg.expectedTotal}`);
  console.log(`  Unexpected findings on non-controls: ${agg.unexpectedOnNonControls}`);
  if (agg.errors) console.log(`  Errors: ${agg.errors}`);

  const run = EvalRunSchema.parse({
    runAt: new Date().toISOString(),
    model: ANALYST_MODEL,
    leaveOneOut,
    aggregate: agg,
    cases: scores,
  });

  mkdirSync("evals", { recursive: true });
  const file = `evals/results-${run.runAt.replace(/[:.]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify(run, null, 2));
  console.log(`\nWrote ${file}`);

  const baselinePath = "evals/baseline.json";
  if (existsSync(baselinePath) && !only) {
    const baseline = EvalRunSchema.safeParse(JSON.parse(readFileSync(baselinePath, "utf8")));
    if (baseline.success) {
      console.log("\nVersus baseline");
      for (const line of diffRuns(run, baseline.data)) console.log(`  ${line}`);
    }
  }
  if (args.includes("--update-baseline")) {
    if (only) console.warn("Not updating the baseline from a single-case run.");
    else {
      writeFileSync(baselinePath, JSON.stringify(run, null, 2));
      console.log(`Updated ${baselinePath}`);
    }
  }
}

void main();
