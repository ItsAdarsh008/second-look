import { describe, expect, it } from "vitest";
import { CALENDAR } from "@/data/calendar";
import { checkCalendar } from "./calendar";
import { CalendarEntrySchema, MARKETS, type CalendarEntry } from "./schema";

describe("calendar data", () => {
  it("is schema-valid with unique ids and covers every market", () => {
    const ids = new Set<string>();
    for (const entry of CALENDAR) {
      expect(() => CalendarEntrySchema.parse(entry), entry.id).not.toThrow();
      expect(ids.has(entry.id), `duplicate id ${entry.id}`).toBe(false);
      ids.add(entry.id);
    }
    for (const m of MARKETS) {
      expect(CALENDAR.some((e) => e.market === m.code), `no entries for ${m.code}`).toBe(true);
    }
  });
});

describe("checkCalendar", () => {
  it("flags Gwangju for a KR launch on 2026-05-18 as solemn with offset 0", () => {
    const hits = checkCalendar("2026-05-18", ["KR"]);
    const gwangju = hits.find((h) => h.entryId === "kr-gwangju-may-18");
    expect(gwangju).toBeDefined();
    expect(gwangju?.gravity).toBe("solemn");
    expect(gwangju?.daysOffset).toBe(0);
    expect(gwangju?.needsVerification).toBe(false);
    expect(hits[0].entryId).toBe("kr-gwangju-may-18");
  });

  it("never returns an exact offset for a variable-date observance", () => {
    for (const entry of CALENDAR.filter((e) => e.dateRule.type === "variable")) {
      if (entry.dateRule.type !== "variable") continue;
      for (const w of entry.dateRule.approximate) {
        const hits = checkCalendar(w.start, [entry.market]).filter((h) => h.entryId === entry.id);
        expect(hits.length, `${entry.id} ${w.start}`).toBeGreaterThan(0);
        for (const h of hits) {
          expect(h.daysOffset).toBeNull();
          expect(h.needsVerification).toBe(true);
        }
      }
    }
  });

  const synthetic: CalendarEntry[] = [
    { id: "x-fixed", market: "KR", label: "Fixed", dateRule: { type: "fixed", date: "01-03" }, gravity: "solemn", guidance: "g" },
    { id: "x-range", market: "KR", label: "Range", dateRule: { type: "range", start: "12-30", end: "01-01" }, gravity: "celebratory", guidance: "g" },
    {
      id: "x-var",
      market: "SA",
      label: "Variable",
      dateRule: { type: "variable", note: "moon", approximate: [{ start: "2026-02-18", end: "2026-03-19" }] },
      gravity: "religious-observance",
      guidance: "g",
    },
  ];

  it("handles windows that cross the new year", () => {
    const hits = checkCalendar("2026-12-28", ["KR"], 7, synthetic);
    const fixed = hits.find((h) => h.entryId === "x-fixed");
    const range = hits.find((h) => h.entryId === "x-range");
    expect(fixed?.daysOffset).toBe(-6);
    expect(fixed?.occurrence.start).toBe("2027-01-03");
    expect(range?.daysOffset).toBe(-2);
    expect(checkCalendar("2026-12-31", ["KR"], 7, synthetic).find((h) => h.entryId === "x-range")?.daysOffset).toBe(0);
  });

  it("respects the window and the market filter", () => {
    expect(checkCalendar("2026-01-11", ["KR"], 7, synthetic).map((h) => h.entryId)).toEqual([]);
    expect(checkCalendar("2026-01-10", ["KR"], 7, synthetic).map((h) => h.entryId)).toEqual(["x-fixed"]);
    expect(checkCalendar("2026-03-01", ["KR"], 7, synthetic)).toEqual([]);
    expect(checkCalendar("2026-03-01", ["SA"], 7, synthetic)[0]).toMatchObject({ entryId: "x-var", daysOffset: null, needsVerification: true });
  });

  it("returns nothing without a launch date", () => {
    expect(checkCalendar(undefined, ["KR"])).toEqual([]);
  });

  it("orders solemn before celebratory", () => {
    const hits = checkCalendar("2026-12-31", ["KR"], 7, synthetic);
    expect(hits.map((h) => h.gravity)).toEqual(["solemn", "celebratory"]);
  });
});
