import type { CaseFixture } from "@/lib/schema";

export const starbucksKorea: CaseFixture = {
  slug: "starbucks-korea",
  title: "Tank Day",
  subtitle: "Starbucks Korea, May 2026",
  kind: "incident-reconstruction",
  dek: "A tumbler promotion with nothing wrong in the picture. The product name, the launch date and the slogan together evoked the Gwangju massacre.",
  input: {
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
  },
  expected: [
    {
      categories: ["calendar-timing"],
      locusKind: "timing",
      minSeverity: "critical",
      description: "Launch on May 18, the Gwangju Democratization Movement anniversary",
    },
    {
      categories: ["historical-memory", "political"],
      locusKind: "copy",
      minSeverity: "high",
      description: "Product name 'Tank' on May 18 evokes the tanks used against Gwangju protesters",
    },
    {
      categories: ["historical-memory", "political"],
      locusKind: "copy",
      minSeverity: "high",
      description: "'Thwack it on the table' echoes the 1987 police account of Park Jong-chul's death",
    },
  ],
  ownIncidentIds: ["starbucks-korea-tank-day-2026"],
  creativeNote:
    "Synthetic reconstruction made for Second Look. This is not Starbucks' original creative. The brand, Harbor Coffee Korea, is fictional on purpose so the analyzer cannot recognize the incident by name and has to find the risk in the product name, launch date and slogan. The image is deliberately clean: no date, no 'tank', no military imagery.",
  history: {
    whatHappened:
      "In May 2026 Starbucks Korea, majority-owned by Shinsegae Group's E-Mart, promoted a large tumbler size called the 'tank' with a 'Tank Day' on May 18 and the slogan 'Thwack it on the table!'. May 18 is the anniversary of the 1980 Gwangju Democratization Movement, when the military crushed pro-democracy protesters in Gwangju. The slogan echoed the 1987 police claim that student activist Park Jong-chul died after investigators struck a desk, not from torture. The promotion was cancelled within hours. Starbucks Korea CEO Sohn Jeong-hyun was fired. Shinsegae chairman Chung Yong-jin apologized on May 19 and again in a televised statement on May 26. Police opened an investigation after complaints from families of Gwangju victims.",
    sources: [
      {
        label: "NBC News — Starbucks struggles to quell outrage over 'Tank Day' ad campaign",
        url: "https://www.nbcnews.com/world/asia/starbucks-tank-day-ad-campaign-south-korea-backlash-rcna346856",
      },
      {
        label: "CBS News — Starbucks Korea apology over campaign evoking Gwangju",
        url: "https://www.cbsnews.com/news/south-korea-starbucks-apology-ad-campaign-massacre-memory/",
      },
      {
        label: "Foreign Policy — Starbucks Ad Mocks Gwangju Martyrs in South Korea",
        url: "https://foreignpolicy.com/2026/06/09/starbucks-gwangju-far-right-south-korea/",
      },
    ],
  },
};
