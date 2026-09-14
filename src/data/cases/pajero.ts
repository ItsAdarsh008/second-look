import type { CaseFixture } from "@/lib/schema";

export const pajero: CaseFixture = {
  slug: "pajero",
  title: "Pajero",
  subtitle: "SUV launch for Mexico",
  kind: "synthetic-language",
  dek: "A nameplate that is vulgar slang in Spanish, and the reason Mitsubishi sold the Pajero as the Montero in Spanish-speaking markets.",
  input: {
    imageUrl: "/cases/pajero.png",
    imageFilePath: null,
    brandName: "Kanto Motors",
    headline: "Sin límites.",
    bodyCopy: "El nuevo Pajero 4x4: tracción total para cualquier camino.",
    productName: "Pajero",
    markets: ["MX"],
    channel: "tv",
  },
  expected: [
    {
      categories: ["language-translation"],
      locusKind: "copy",
      minSeverity: "high",
      description: "'Pajero' is vulgar Spanish slang ('wanker'), readable as such in Mexico and across Latin America",
    },
  ],
  ownIncidentIds: ["mitsubishi-pajero-spanish"],
  creativeNote:
    "Synthetic image made for Second Look with a fictional carmaker (Kanto Motors). It is not Mitsubishi's creative. The picture is an ordinary SUV-on-a-dirt-road poster. The risk is the nameplate itself, which appears in the product name and body copy and on the badge.",
  history: {
    whatHappened:
      "Mitsubishi launched the Pajero SUV in 1982, naming it after the pampas cat (Leopardus pajeros). In Spanish, 'paja' is vulgar slang for masturbation and 'pajero' for someone who masturbates. For that reason Mitsubishi sold the same vehicle as the Montero in Spain, North America and most of Latin America. In the United Kingdom it was sold as the Shogun.",
    sources: [
      {
        label: "Wikipedia — Mitsubishi Pajero (etymology and market names)",
        url: "https://en.wikipedia.org/wiki/Mitsubishi_Pajero",
      },
      {
        label: "Real Academia Española, Diccionario de la lengua española — pajero, ra",
        url: "https://dle.rae.es/pajero",
      },
    ],
  },
};
