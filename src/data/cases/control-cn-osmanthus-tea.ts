import type { CaseFixture } from "@/lib/schema";
import { creativeUrl } from "./creative";

export const controlCnOsmanthusTea: CaseFixture = {
  slug: "control-cn-osmanthus-tea",
  title: "Osmanthus oolong",
  subtitle: "Autumn milk tea for China",
  kind: "control",
  dek: "A limited-edition milk tea with a Chinese headline, launched in early November. It should come back clean.",
  input: {
    imageUrl: creativeUrl("control-cn-osmanthus-tea"),
    imageFilePath: null,
    brandName: "Lanting Tea",
    headline: "桂花乌龙 · 秋日限定",
    bodyCopy: "Osmanthus oolong milk tea, back for autumn. Brewed fresh in every store.",
    productName: "Osmanthus Oolong Milk Tea",
    markets: ["CN"],
    launchDate: "2026-11-03",
    channel: "social",
  },
  expected: [],
  ownIncidentIds: [],
  creativeNote:
    "Synthetic image made for Second Look with a fictional brand (Lanting Tea). It is not any brand's original creative. It was built as a control: a competent, unremarkable seasonal ad for the Chinese market. The image deliberately avoids clocks, green hats, white chrysanthemums and the number 4.",
  history: null,
};
