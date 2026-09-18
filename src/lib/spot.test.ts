import { describe, expect, it } from "vitest";
import { CASES } from "@/data/cases";
import { creativeUrl } from "@/data/cases/creative";
import { CREATIVE_VERSIONS } from "@/data/cases/creative-versions";
import { SPOT_KEYS, spotKey } from "@/data/spot";
import { toExampleCases } from "./examples";
import { isHit, missLine, NEW_PROGRESS, stepSpot, triesLeft, type SpotKey } from "./spot";

const hat = spotKey("green-hat") as SpotKey;
const tank = spotKey("starbucks-korea") as SpotKey;
const onHat = { type: "guess", guess: { kind: "point", x: 0.5, y: 0.25 } } as const;
const onCoat = { type: "guess", guess: { kind: "point", x: 0.5, y: 0.6 } } as const;

describe("spot the issue", () => {
  it("has a grounded answer key inside the picture for every case shown, in play order", () => {
    expect(toExampleCases(CASES).map((c) => c.slug)).toEqual(SPOT_KEYS.map((k) => k.slug));
    for (const key of SPOT_KEYS) {
      expect(key.regions.length + key.lines.length, key.slug).toBeGreaterThan(0);
      expect(key.why.length, key.slug).toBeGreaterThan(40);
      expect(key.hint, key.slug).not.toMatch(new RegExp(key.answer.replace(/\.$/, ""), "i"));
      for (const [x, y, w, h] of key.regions) {
        expect(x + w, key.slug).toBeLessThanOrEqual(1);
        expect(y + h, key.slug).toBeLessThanOrEqual(1);
      }
    }
  });

  it("counts a tap inside the region, with a little slack, and misses outside it", () => {
    expect(isHit(hat, onHat.guess)).toBe(true);
    expect(isHit(hat, { kind: "point", x: 0.5, y: 0.17 })).toBe(true);
    expect(isHit(hat, onCoat.guess)).toBe(false);
    expect(isHit(hat, { kind: "line", field: "headline" })).toBe(false);
  });

  it("gives two tries, then shows the answer; a catch records which try", () => {
    const once = stepSpot(hat, NEW_PROGRESS, onCoat);
    expect(once.outcome).toBeNull();
    expect(triesLeft(once)).toBe(1);
    expect(stepSpot(hat, once, onHat).outcome).toEqual({ kind: "caught", guess: onHat.guess, tries: 2 });
    expect(stepSpot(hat, once, onCoat).outcome).toEqual({ kind: "shown" });
    expect(stepSpot(hat, NEW_PROGRESS, { type: "show" }).outcome).toEqual({ kind: "shown" });
    const caught = stepSpot(hat, NEW_PROGRESS, onHat);
    expect(stepSpot(hat, caught, onCoat)).toBe(caught);
  });

  it("treats the real failure as a clean picture with the risk in the brief", () => {
    expect(isHit(tank, { kind: "point", x: 0.5, y: 0.5 })).toBe(false);
    expect(missLine(tank, { kind: "point", x: 0.5, y: 0.5 })).toBe("Nothing wrong in the picture.");
    expect(isHit(tank, { kind: "line", field: "launchDate" })).toBe(true);
    expect(isHit(tank, { kind: "line", field: "headline" })).toBe(true);
    expect(missLine(hat, { kind: "line", field: "headline" })).toBe("The words are fine.");
  });
});

describe("creativeUrl", () => {
  it("versions every case creative by content, so a redraw changes the URL", () => {
    for (const c of CASES) {
      expect(c.input.imageUrl).toBe(`/cases/${c.slug}.png?v=${CREATIVE_VERSIONS[c.slug]}`);
      expect(creativeUrl(c.slug, "thumb")).toBe(`/cases/${c.slug}-thumb.png?v=${CREATIVE_VERSIONS[c.slug]}`);
    }
  });
});
