import { describe, expect, it } from "vitest";
import { CASES } from "@/data/cases";
import { creativeUrl } from "@/data/cases/creative";
import { CREATIVE_VERSIONS } from "@/data/cases/creative-versions";
import { SPOT_KEYS, spotKey, toSpotRounds } from "@/data/spot";
import { isHit, verdictLine, type SpotKey } from "./spot";

const hat = spotKey("green-hat") as SpotKey;
const tank = spotKey("starbucks-korea") as SpotKey;

describe("spot the issue", () => {
  it("has an answer key for every case shown, each grounded and inside the picture", () => {
    expect(toSpotRounds(CASES).map((r) => r.slug).sort()).toEqual(CASES.map((c) => c.slug).sort());
    for (const key of SPOT_KEYS) {
      expect(key.regions.length + key.lines.length, key.slug).toBeGreaterThan(0);
      expect(key.why.length, key.slug).toBeGreaterThan(40);
      for (const [x, y, w, h] of key.regions) {
        expect(x + w, key.slug).toBeLessThanOrEqual(1);
        expect(y + h, key.slug).toBeLessThanOrEqual(1);
      }
    }
  });

  it("scores a tap inside the region, with a little slack, and misses outside it", () => {
    expect(isHit(hat, { kind: "point", x: 0.5, y: 0.25 })).toBe(true);
    expect(isHit(hat, { kind: "point", x: 0.5, y: 0.17 })).toBe(true);
    expect(isHit(hat, { kind: "point", x: 0.5, y: 0.6 })).toBe(false);
    expect(isHit(hat, { kind: "words" })).toBe(false);
    expect(verdictLine(hat, { kind: "words" })).toBe("It’s in the picture.");
  });

  it("treats the real failure as a words-and-date case with a clean picture", () => {
    expect(isHit(tank, { kind: "point", x: 0.5, y: 0.5 })).toBe(false);
    expect(verdictLine(tank, { kind: "point", x: 0.5, y: 0.5 })).toBe("Nothing was wrong with the picture.");
    expect(isHit(tank, { kind: "line", field: "launchDate" })).toBe(true);
    expect(isHit(tank, { kind: "words" })).toBe(true);
    expect(verdictLine(tank, { kind: "fine" })).toBe("That’s what the approval chain said too.");
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
