import type { CaseFixture } from "./schema";

/** Only what the brief needs from a fixture, to keep the page payload small. */
export type ExampleCase = Pick<CaseFixture, "slug" | "title" | "kind" | "input">;

export function toExampleCases(cases: readonly CaseFixture[]): ExampleCase[] {
  return cases.map(({ slug, title, kind, input }) => ({ slug, title, kind, input }));
}
