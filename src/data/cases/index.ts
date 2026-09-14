import type { CaseFixture } from "@/lib/schema";

import { controlCnOsmanthusTea } from "./control-cn-osmanthus-tea";
import { controlKrSweetPotatoLatte } from "./control-kr-sweet-potato-latte";
import { controlMxAguaFresca } from "./control-mx-agua-fresca";
import { greenHat } from "./green-hat";
import { pajero } from "./pajero";
import { risingSunRays } from "./rising-sun-rays";
import { starbucksKorea } from "./starbucks-korea";
import { vuelaEnCuero } from "./vuela-en-cuero";
import { whiteIsPurity } from "./white-is-purity";

/** Case studies for the gallery and the eval harness. `starbucks-korea` leads. */
export const CASES: CaseFixture[] = [
  starbucksKorea,
  risingSunRays,
  greenHat,
  pajero,
  vuelaEnCuero,
  whiteIsPurity,
  controlKrSweetPotatoLatte,
  controlMxAguaFresca,
  controlCnOsmanthusTea,
];

export function getCase(slug: string): CaseFixture | undefined {
  return CASES.find((c) => c.slug === slug);
}
