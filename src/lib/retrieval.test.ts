import { describe, expect, it } from "vitest";
import { INCIDENTS } from "@/data/incidents";
import { dateTokens, formatIncidentsForPrompt, normalize, rankIncidents, retrieveIncidents } from "./retrieval";
import { IncidentSchema, type CampaignInput, type Incident } from "./schema";

const minimalTank: CampaignInput = {
  imageUrl: "/cases/starbucks-korea.png",
  imageFilePath: null,
  headline: "",
  bodyCopy: "",
  productName: "Tank",
  markets: ["KR"],
  launchDate: "2026-05-18",
  channel: "social",
};

describe("incident corpus", () => {
  it("has at least 30 schema-valid entries with unique ids", () => {
    expect(INCIDENTS.length).toBeGreaterThanOrEqual(30);
    const ids = new Set<string>();
    for (const incident of INCIDENTS) {
      expect(() => IncidentSchema.parse(incident), incident.id).not.toThrow();
      expect(ids.has(incident.id), `duplicate id ${incident.id}`).toBe(false);
      ids.add(incident.id);
    }
  });
});

describe("retrieveIncidents", () => {
  it("surfaces Starbucks Korea Tank Day in the top 3 for a KR 'Tank' launched May 18", () => {
    const top3 = retrieveIncidents(minimalTank, 3).map((i) => i.id);
    expect(top3).toContain("starbucks-korea-tank-day-2026");
  });

  it("honours leave-one-out exclusion", () => {
    const ids = retrieveIncidents(minimalTank, 12, { excludeIds: ["starbucks-korea-tank-day-2026"] }).map((i) => i.id);
    expect(ids).not.toContain("starbucks-korea-tank-day-2026");
  });

  const corpus: Incident[] = [
    {
      id: "a",
      brand: "A",
      title: "A",
      year: 2020,
      markets: ["KR"],
      region: "South Korea",
      categories: ["historical-memory"],
      whatHappened: "x",
      whyItLanded: "x",
      outcome: "x",
      signals: ["unrelated", "words", "here"],
      sourceUrl: "https://example.com/a",
    },
    {
      id: "b",
      brand: "B",
      title: "B",
      year: 2019,
      markets: ["US"],
      region: "United States",
      categories: ["language-translation", "religious"],
      whatHappened: "x",
      whyItLanded: "x",
      outcome: "x",
      signals: ["tank", "may 18", "tumbler"],
      sourceUrl: "https://example.com/b",
    },
    {
      id: "c",
      brand: "C",
      title: "C",
      year: 2018,
      markets: ["FR"],
      region: "France",
      categories: ["religious"],
      whatHappened: "x",
      whyItLanded: "x",
      outcome: "x",
      signals: ["croissant", "baguette", "beret"],
      sourceUrl: "https://example.com/c",
    },
  ];

  it("weights market overlap above a single word match and drops irrelevant incidents", () => {
    const ranked = rankIncidents({ ...minimalTank, launchDate: undefined }, 12, { corpus });
    expect(ranked.map((r) => r.incident.id)).toEqual(["a", "b"]);
  });

  it("lets strong signal overlap outrank market overlap", () => {
    const ranked = rankIncidents({ ...minimalTank, bodyCopy: "our biggest tumbler" }, 12, { corpus });
    expect(ranked[0].incident.id).toBe("b");
    expect(ranked[0].matchedSignals).toEqual(expect.arrayContaining(["tank", "may 18", "tumbler"]));
  });

  it("formats a numbered block with ids and sources", () => {
    const block = formatIncidentsForPrompt(corpus.slice(0, 2));
    expect(block).toContain("[1] id=a");
    expect(block).toContain("[2] id=b");
    expect(block).toContain("Source: https://example.com/b");
  });
});

describe("normalize / dateTokens", () => {
  it("strips accents and punctuation", () => {
    expect(normalize("Sin límites.")).toBe("sin limite");
  });

  it("renders common spellings of a date", () => {
    expect(dateTokens("2026-05-18")).toEqual(expect.arrayContaining(["may 18", "5.18", "05-18", "518"]));
  });
});
