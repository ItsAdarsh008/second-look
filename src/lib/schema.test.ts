import { describe, expect, it } from "vitest";
import { AnalysisResultSchema, CampaignInputSchema, FindingSchema, LocusSchema } from "./schema";
import { tankInput, validDraft } from "@/test/fixtures";

const validFinding = { ...validDraft, id: "f1" };

describe("FindingSchema", () => {
  it("accepts a valid finding", () => {
    expect(FindingSchema.safeParse(validFinding).success).toBe(true);
  });

  it("rejects a finding with no precedents (rule 2: no ungrounded findings)", () => {
    const result = FindingSchema.safeParse({ ...validFinding, precedents: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a claim longer than 200 characters", () => {
    const result = FindingSchema.safeParse({ ...validFinding, claim: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects a bbox value outside 0–1", () => {
    const result = FindingSchema.safeParse({
      ...validFinding,
      locus: { kind: "image", bbox: [0.1, 0.2, 1.4, 0.3], description: "rays" },
    });
    expect(result.success).toBe(false);
    expect(LocusSchema.safeParse({ kind: "image", bbox: [-0.1, 0, 0.5, 0.5], description: "rays" }).success).toBe(false);
  });

  it("rejects a confidence outside 0–1", () => {
    expect(FindingSchema.safeParse({ ...validFinding, confidence: 1.2 }).success).toBe(false);
    expect(FindingSchema.safeParse({ ...validFinding, confidence: -0.01 }).success).toBe(false);
  });

  it("rejects an incident precedent that doesn't name its brand", () => {
    const precedents = [{ ...validFinding.precedents[0], brand: null }];
    expect(FindingSchema.safeParse({ ...validFinding, precedents }).success).toBe(false);
  });
});

describe("CampaignInputSchema", () => {
  it("accepts the Tank Day reconstruction", () => {
    expect(CampaignInputSchema.safeParse(tankInput).success).toBe(true);
  });

  it("rejects an impossible launch date", () => {
    expect(CampaignInputSchema.safeParse({ ...tankInput, launchDate: "2026-02-30" }).success).toBe(false);
  });

  it("rejects an unsupported market", () => {
    expect(CampaignInputSchema.safeParse({ ...tankInput, markets: ["NZ"] }).success).toBe(false);
  });

  it("rejects non-https image URLs", () => {
    expect(CampaignInputSchema.safeParse({ ...tankInput, imageUrl: "http://example.com/a.png" }).success).toBe(false);
  });
});

describe("AnalysisResultSchema", () => {
  it("accepts zero findings as a valid result", () => {
    const result = AnalysisResultSchema.safeParse({
      id: "a1",
      input: tankInput,
      findings: [],
      marketsAnalyzed: ["KR"],
      corpusHits: [],
      calendarHits: [],
      reviewNotes: "Checked name, copy, date and image.",
      analyzedAt: new Date().toISOString(),
      modelUsed: "claude-opus-5",
    });
    expect(result.success).toBe(true);
  });
});
