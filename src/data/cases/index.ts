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

/** Case studies shown in the app: the example picker, the gallery and the case pages. `starbucks-korea` leads. */
export const CASES: CaseFixture[] = [starbucksKorea, risingSunRays, greenHat];

/**
 * Everything `npm run eval` scores. The extra cases aren't shown in the app, but the
 * language cases are the only tests of risk in the words and the controls are the only
 * measure of false positives, so they stay in the eval set.
 */
export const EVAL_CASES: CaseFixture[] = [
  ...CASES,
  whiteIsPurity,
  pajero,
  vuelaEnCuero,
  controlKrSweetPotatoLatte,
  controlMxAguaFresca,
  controlCnOsmanthusTea,
];

export function getCase(slug: string): CaseFixture | undefined {
  return CASES.find((c) => c.slug === slug);
}
