import type { CaseFixture } from "@/lib/schema";
import { creativeUrl } from "./creative";

export const vuelaEnCuero: CaseFixture = {
  slug: "vuela-en-cuero",
  title: "Vuela en cuero",
  subtitle: "Airline print ad for Mexico",
  kind: "synthetic-language",
  dek: "A slogan for new leather seats that also reads as 'fly naked'. The old Braniff story, rebuilt with a fictional airline.",
  input: {
    imageUrl: creativeUrl("vuela-en-cuero"),
    imageFilePath: null,
    brandName: "Solara Air",
    headline: "Vuela en cuero.",
    bodyCopy: "Nuevos asientos de piel en clase ejecutiva, en todas nuestras rutas a Monterrey y Cancún.",
    productName: "Solara Business",
    markets: ["MX"],
    channel: "print",
  },
  expected: [
    {
      categories: ["language-translation"],
      locusKind: "copy",
      minSeverity: "moderate",
      description: "'Vuela en cuero' reads as 'fly naked' in Mexican Spanish ('en cueros' means naked)",
    },
  ],
  ownIncidentIds: ["braniff-fly-in-leather"],
  creativeNote:
    "Synthetic image made for Second Look with a fictional airline (Solara Air). It is not Braniff's or any airline's original creative. The picture is an ordinary leather business-class seat by a window. The risk is in the headline.",
  history: {
    whatHappened:
      "Braniff promoted its new leather seats to Spanish-speaking passengers in a campaign that began in Mexico in October 1986. In February 1987 UPI reported that Braniff's ads in Miami's Spanish-language media read 'sentado en cuero', which commonly means 'sitting naked'. Leather seats would need 'sentado en asientos de cuero'. Local ad executives joked about it. Braniff's marketing vice president said the double meaning was not intentional and that the campaign had drawn no complaints in Mexico. The story is usually retold as 'Fly in Leather' / 'Vuela en cuero', but the contemporaneous report documents the 'sentado en cuero' wording.",
    sources: [
      {
        label: "UPI Archives (Feb. 5, 1987) — Braniff's Spanish ad urges passengers to 'sit naked'",
        url: "https://www.upi.com/Archives/1987/02/05/Braniffs-Spanish-ad-urges-passengers-to-sit-naked/5696539499600/",
      },
    ],
  },
};
