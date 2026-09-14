import { CaseResultSchema, type CaseResult } from "@/lib/schema";
import { RAW_CASE_RESULTS } from "./results/index";

export function getCaseResult(slug: string): CaseResult | null {
  const raw = RAW_CASE_RESULTS[slug];
  if (!raw) return null;
  const parsed = CaseResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
