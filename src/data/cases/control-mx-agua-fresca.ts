import type { CaseFixture } from "@/lib/schema";

export const controlMxAguaFresca: CaseFixture = {
  slug: "control-mx-agua-fresca",
  title: "Agua de jamaica",
  subtitle: "Summer drink for Mexico",
  kind: "control",
  dek: "A hibiscus drink launched in July, in plain, idiomatic Spanish. It should come back clean.",
  input: {
    imageUrl: "/cases/control-mx-agua-fresca.png",
    imageFilePath: null,
    brandName: "Río Claro",
    headline: "Refréscate este verano.",
    bodyCopy: "Agua de jamaica sin azúcar añadida. Encuéntrala en tu tienda de siempre.",
    productName: "Río Claro Jamaica",
    markets: ["MX"],
    launchDate: "2026-07-08",
    channel: "ooh",
  },
  expected: [],
  ownIncidentIds: [],
  creativeNote:
    "Synthetic image made for Second Look with a fictional brand (Río Claro). It is not any brand's original creative. It was built as a control: a competent, unremarkable summer ad for the Mexican market.",
  history: null,
};
