import type { CaseFixture } from "@/lib/schema";

export const whiteIsPurity: CaseFixture = {
  slug: "white-is-purity",
  title: "White Is Purity",
  subtitle: "Nivea Middle East, 2017",
  kind: "incident-reconstruction",
  dek: "A deodorant slogan that doubled as a white-supremacist line. The picture was harmless; the headline was not.",
  input: {
    imageUrl: "/cases/white-is-purity.png",
    imageFilePath: null,
    brandName: "Clearday",
    headline: "White is purity.",
    bodyCopy: "Keep it clean, keep it bright. Don't let anything ruin it.",
    productName: "Clearday Invisible for Black & White",
    markets: ["SA", "EG", "US"],
    channel: "social",
  },
  expected: [
    {
      categories: ["racial-ethnic"],
      locusKind: "copy",
      minSeverity: "high",
      description:
        "'White is purity' is a white-supremacist slogan, and on a black-and-white product it reads as a racial statement",
    },
  ],
  ownIncidentIds: ["nivea-white-is-purity-2017"],
  creativeNote:
    "Synthetic reconstruction made for Second Look with a fictional brand (Clearday). It is not Nivea's original ad. The brand is fictional on purpose so the analyzer cannot recognize the incident by name. The image is benign on its own, a woman in a white robe by a window. The risk is the headline paired with a black-and-white product.",
  history: {
    whatHappened:
      "In April 2017 Nivea's Middle East Facebook page posted an ad for its Invisible for Black & White deodorant. It showed a woman with long dark hair, seen from behind in a white robe, under the words 'White is purity', with the caption 'Keep it clean, keep it bright. Don't let anything ruin it.' Critics called it racist, and white-supremacist accounts on Twitter and 4chan shared it approvingly. Nivea's parent company Beiersdorf deleted the post and apologized: 'We are deeply sorry to anyone who may take offense to this specific post.'",
    sources: [
      {
        label: "CBS News — Nivea pulls \"white purity\" ad after backlash and racism claims",
        url: "https://www.cbsnews.com/news/nivea-pulls-white-purity-ad-after-backlash-and-racism-claims/",
      },
      {
        label: "CBC News — Nivea pulls controversial 'White is purity' ad after complaints",
        url: "https://www.cbc.ca/news/business/nivea-ad-campaign-racist-1.4056258",
      },
    ],
  },
};
