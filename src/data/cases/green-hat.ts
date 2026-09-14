import type { CaseFixture } from "@/lib/schema";

export const greenHat: CaseFixture = {
  slug: "green-hat",
  title: "The green hat",
  subtitle: "Menswear for China",
  kind: "synthetic-visual",
  dek: "A bright green hat is the focal point. In Chinese idiom, a man wearing one is a cuckold.",
  input: {
    imageUrl: "/cases/green-hat.png",
    imageFilePath: null,
    brandName: "Northline",
    headline: "Dressed for the season.",
    bodyCopy: "Wool-blend layers for cold mornings. New in stores this week.",
    productName: "Northline Autumn Collection",
    markets: ["CN"],
    channel: "digital-display",
    brandNotes: "Keep the camel coat and the Northline wordmark.",
  },
  expected: [
    {
      categories: ["color-symbolism", "gesture-symbol"],
      locusKind: "image",
      minSeverity: "moderate",
      description: "A man wearing a green hat signals a cuckolded husband in Chinese idiom (戴绿帽子)",
    },
  ],
  ownIncidentIds: [],
  creativeNote:
    "Synthetic image made for Second Look with a fictional brand (Northline). It is not any brand's original creative. The green hat is the focal point on purpose, so the risk is entirely visual and the copy is clean.",
  history: null,
};
