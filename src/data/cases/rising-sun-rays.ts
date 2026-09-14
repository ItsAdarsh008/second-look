import type { CaseFixture } from "@/lib/schema";

export const risingSunRays: CaseFixture = {
  slug: "rising-sun-rays",
  title: "Rising Sun rays",
  subtitle: "Energy drink for Korea and China",
  kind: "synthetic-visual",
  dek: "The copy is clean. The red-and-white rays behind the can are the whole risk.",
  input: {
    imageUrl: "/cases/rising-sun-rays.png",
    imageFilePath: null,
    brandName: "Volt",
    headline: "Power through the afternoon.",
    bodyCopy: "Zero sugar. Real citrus. 80mg of caffeine when you need it.",
    productName: "Volt Citrus",
    markets: ["KR", "CN"],
    channel: "ooh",
    brandNotes: "Keep the black Volt can and the yellow VOLT wordmark.",
  },
  expected: [
    {
      categories: ["historical-memory", "national-symbol", "gesture-symbol"],
      locusKind: "image",
      minSeverity: "high",
      description: "Radiating red rays behind the can read as the Rising Sun flag in Korea and China",
    },
  ],
  ownIncidentIds: [],
  creativeNote:
    "Synthetic image made for Second Look with a fictional brand (Volt). It is not any brand's original creative. The sunburst was drawn on purpose to evoke the Rising Sun flag, with 16 red rays around an off-center red disc, so the risk is entirely visual.",
  history: null,
};
