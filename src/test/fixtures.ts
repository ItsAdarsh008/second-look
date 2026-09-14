import type { CampaignInput, Finding, FindingDraft } from "@/lib/schema";

export const tankInput: CampaignInput = {
  imageUrl: "/cases/starbucks-korea.png",
  imageFilePath: null,
  brandName: "Harbor Coffee Korea",
  headline: "Thwack it on the table!",
  bodyCopy: "Meet the Tank — our biggest tumbler yet, built for all-day refills. Tank Day, May 18 only.",
  productName: "Tank",
  markets: ["KR"],
  launchDate: "2026-05-18",
  channel: "social",
  brandNotes: "Preserve the Harbor Coffee wordmark and the navy/cream palette.",
};

export const raysInput: CampaignInput = {
  imageUrl: "/cases/rising-sun-rays.png",
  imageFilePath: null,
  brandName: "Volt",
  headline: "Power through the afternoon.",
  bodyCopy: "Zero sugar. Real citrus. 80mg of caffeine when you need it.",
  productName: "Volt Citrus",
  markets: ["KR", "CN"],
  channel: "ooh",
  brandNotes: "Keep the can artwork and the Volt wordmark exactly as they are.",
};

export const validDraft: FindingDraft = {
  severity: "critical",
  category: "calendar-timing",
  markets: ["KR"],
  locus: { kind: "timing", date: "2026-05-18", reason: "Launch falls on the Gwangju Democratization Movement anniversary" },
  claim: "Launching on May 18 puts the promotion on the anniversary of the 1980 Gwangju massacre.",
  rationale:
    "May 18 is a national memorial day in South Korea for the Gwangju Democratization Movement. A promotional 'day' on that date reads as trivializing it. Combined with a product called 'Tank', the date makes the reference unmistakable.",
  precedents: [
    {
      kind: "incident",
      title: "Tank Day",
      brand: "Starbucks Korea",
      year: 2026,
      market: "South Korea",
      summary: "A tumbler called the 'tank' was promoted as 'Tank Day' on May 18 with the slogan 'Thwack it on the table!'.",
      outcome: "Cancelled within hours; CEO fired; police investigation opened.",
      sourceUrl: "https://www.nbcnews.com/world/asia/starbucks-tank-day-ad-campaign-south-korea-backlash-rcna346856",
      incidentId: "starbucks-korea-tank-day-2026",
    },
  ],
  confidence: 0.95,
  fixDirective: "Move the launch off May 18 and out of the surrounding memorial week.",
};

export function finding(overrides: Partial<Finding> & Pick<Finding, "id">): Finding {
  return { ...validDraft, ...overrides };
}

export const imageFindingRays: Finding = finding({
  id: "f-rays",
  severity: "high",
  category: "historical-memory",
  markets: ["KR", "CN"],
  locus: {
    kind: "image",
    bbox: [0, 0, 1, 1],
    description: "Red-and-white radiating sunburst filling the background behind the can",
  },
  claim: "The radiating red rays behind the can read as the Rising Sun flag in Korean and Chinese markets.",
  fixDirective: "Replace the radiating red-and-white ray pattern behind the can with a flat warm-orange background",
});

export const imageFindingHand: Finding = finding({
  id: "f-hand",
  severity: "moderate",
  category: "gesture-symbol",
  markets: ["KR"],
  locus: { kind: "image", bbox: [0.62, 0.55, 0.2, 0.2], description: "Hand in the lower right making a gesture" },
  claim: "The hand gesture in the lower right reads as an insult in the target market.",
  fixDirective: "Change the hand in the lower right to hold the can with a relaxed open grip",
});

export const copyFindingTank: Finding = finding({
  id: "f-copy",
  severity: "high",
  category: "historical-memory",
  markets: ["KR"],
  locus: { kind: "copy", field: "productName", excerpt: "Tank" },
  claim: "The product name 'Tank' on a May 18 launch evokes the tanks used against Gwangju protesters.",
  fixDirective: "Rename the product",
});

export const timingFinding: Finding = finding({ id: "f-timing" });
