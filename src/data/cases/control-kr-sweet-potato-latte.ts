import type { CaseFixture } from "@/lib/schema";

export const controlKrSweetPotatoLatte: CaseFixture = {
  slug: "control-kr-sweet-potato-latte",
  title: "Sweet potato latte",
  subtitle: "Autumn drink for Korea",
  kind: "control",
  dek: "An ordinary seasonal launch from the same fictional coffee chain as Tank Day, in the same market. It should come back clean.",
  input: {
    imageUrl: "/cases/control-kr-sweet-potato-latte.png",
    imageFilePath: null,
    brandName: "Harbor Coffee Korea",
    headline: "Sweet potato season is back.",
    bodyCopy:
      "Roasted sweet potato latte returns for autumn — warm, nutty, and just sweet enough. In all stores from October 20.",
    productName: "Roasted Sweet Potato Latte",
    markets: ["KR"],
    launchDate: "2026-10-20",
    channel: "social",
  },
  expected: [],
  ownIncidentIds: [],
  creativeNote:
    "Synthetic image made for Second Look with a fictional brand (Harbor Coffee Korea). It is not any brand's original creative. It was built as a control: a competent, unremarkable seasonal ad for the Korean market.",
  history: null,
};
