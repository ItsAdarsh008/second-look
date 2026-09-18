import type { CaseFixture } from "@/lib/schema";
import { creativeUrl } from "./creative";

export const risingSunRays: CaseFixture = {
  slug: "rising-sun-rays",
  title: "Rising Sun rays",
  subtitle: "Sunscreen for Korea and China",
  kind: "synthetic-visual",
  dek: "A retro sunrise on a sunscreen poster. The copy is clean; the red rays around a red disc are the whole risk.",
  input: {
    imageUrl: creativeUrl("rising-sun-rays"),
    imageFilePath: null,
    brandName: "Morrow",
    headline: "Light enough for every morning.",
    bodyCopy: "Daily sun fluid, SPF 50+ PA++++. No white cast, no sticky finish.",
    productName: "Morrow Daily Sun Fluid",
    markets: ["KR", "CN"],
    channel: "ooh",
    brandNotes: "Keep the white tube, the arched window and the Morrow wordmark.",
  },
  expected: [
    {
      categories: ["historical-memory", "national-symbol", "gesture-symbol"],
      locusKind: "image",
      minSeverity: "high",
      description: "The red rays around a red sun disc behind the tube read as the Rising Sun flag in Korea and China",
    },
  ],
  ownIncidentIds: [],
  creativeNote:
    "Synthetic image made for Second Look with a fictional brand (Morrow). It is not any brand's original creative. The sunrise is the kind of motif a designer reaches for on a sunscreen ad, drawn on purpose with 16 red rays around a red disc so the risk is entirely visual.",
  history: null,
};
