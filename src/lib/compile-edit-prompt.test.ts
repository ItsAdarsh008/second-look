import { describe, expect, it } from "vitest";
import { MAX_PROMPT_CHARS, compileEditPrompt, describeRegion } from "./compile-edit-prompt";
import { copyFindingTank, finding, imageFindingHand, imageFindingRays, raysInput, timingFinding } from "@/test/fixtures";

const fixture = [timingFinding, imageFindingHand, copyFindingTank, imageFindingRays];

describe("compileEditPrompt", () => {
  const compiled = compileEditPrompt(fixture, raysInput);

  it("matches the snapshot", () => {
    expect(compiled.prompt).toMatchSnapshot();
    expect(compiled.variantPrompts).toMatchSnapshot();
  });

  it("addresses only image findings, most severe first", () => {
    expect(compiled.addressed.map((f) => f.id)).toEqual(["f-rays", "f-hand"]);
    expect(compiled.deferred).toEqual([]);
  });

  it("puts copy and timing findings in unaddressable, with explanations", () => {
    expect(compiled.unaddressable.map((f) => f.id).sort()).toEqual(["f-copy", "f-timing"]);
    const byId = Object.fromEntries(compiled.unaddressable.map((f) => [f.id, f.explanation]));
    expect(byId["f-timing"]).toMatch(/scheduling change — image editing cannot resolve this/);
    expect(byId["f-copy"]).toMatch(/renaming the product/);
  });

  it("is a single paragraph under the cap", () => {
    expect(compiled.prompt).not.toMatch(/\n/);
    expect(compiled.prompt.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    expect(compiled.prompt).toMatch(/^Make a minimal, surgical retouch/);
  });

  it("contains no hedging language and no severity labels", () => {
    expect(compiled.prompt).not.toMatch(/\b(may|might|could|perhaps|possibly|consider|potentially|try to|if possible)\b/i);
    expect(compiled.prompt).not.toMatch(/\b(critical|high|moderate|low|severity)\b/i);
  });

  it("states what to preserve, including brand notes", () => {
    expect(compiled.prompt).toContain("Keep everything else exactly as it is");
    expect(compiled.prompt).toContain("logo and its placement");
    expect(compiled.prompt).toContain("Keep the can artwork and the Volt wordmark exactly as they are");
  });

  it("emits one variant per image finding", () => {
    expect(compiled.variantPrompts.map((v) => v.findingId)).toEqual(["f-rays", "f-hand"]);
    expect(compiled.variantPrompts[1].prompt).toContain("relaxed open grip");
    expect(compiled.variantPrompts[1].prompt).not.toContain("warm-orange");
  });

  it("strips hedges a model slipped into a directive", () => {
    const hedgy = finding({
      ...imageFindingHand,
      id: "f-hedgy",
      fixDirective: "Consider replacing the hand gesture with an open palm if possible (moderate)",
    });
    const { prompt } = compileEditPrompt([hedgy], raysInput);
    expect(prompt).toContain("Replace the hand gesture with an open palm (in the lower right).");
    expect(prompt).not.toMatch(/consider|if possible|moderate/i);
  });

  it("returns an empty prompt when nothing is addressable", () => {
    const res = compileEditPrompt([timingFinding, copyFindingTank], raysInput);
    expect(res.prompt).toBe("");
    expect(res.addressed).toEqual([]);
    expect(res.unaddressable).toHaveLength(2);
  });

  it("defers findings that would push the prompt past the cap", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      finding({ ...imageFindingHand, id: `f-${i}`, fixDirective: `Repaint object number ${i} ${"with a much calmer neutral surface ".repeat(6)}` }),
    );
    const res = compileEditPrompt(many, raysInput);
    expect(res.prompt.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    expect(res.addressed.length + res.deferred.length).toBe(12);
    expect(res.deferred.length).toBeGreaterThan(0);
  });
});

describe("describeRegion", () => {
  it("names positions in plain language", () => {
    expect(describeRegion([0, 0, 1, 1])).toBe("across most of the frame");
    expect(describeRegion([0.7, 0.7, 0.2, 0.2])).toBe("in the lower right");
    expect(describeRegion([0.4, 0.4, 0.2, 0.2])).toBe("in the center");
    expect(describeRegion([0.05, 0.4, 0.2, 0.2])).toBe("on the left");
  });
});
