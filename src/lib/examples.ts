import { spotKey, spotOrder } from "@/data/spot";
import type { CaseFixture } from "./schema";
import type { SpotKey } from "./spot";

/** Only what the brief needs from a fixture, to keep the page payload small, plus its spot-the-issue answer key. */
export type ExampleCase = Pick<CaseFixture, "slug" | "title" | "kind" | "input"> & { spot: SpotKey | null };

/** Cases in spot-the-issue play order. */
export function toExampleCases(cases: readonly CaseFixture[]): ExampleCase[] {
  return cases
    .map(({ slug, title, kind, input }) => ({ slug, title, kind, input, spot: spotKey(slug) }))
    .sort((a, b) => spotOrder(a.slug) - spotOrder(b.slug));
}
