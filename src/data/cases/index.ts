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

/**
 * Case studies shown in the app: the example picker, the gallery and the case pages.
 *
 * The first entry leads everywhere — it's the card on the landing page's light table and the
 * featured case on /cases. `rising-sun-rays` holds it because its finding is in the image, so its
 * page carries a generated alternative and the Magic Hour request beside it; `starbucks-korea` has
 * nothing wrong with its picture and so shows no alternative at all.
 *
 * Worth knowing if this is ever revisited: Tank Day is the founding case, and the argument for the
 * whole product is that its failure was entirely in the name, the date and the slogan. Leading with
 * an image finding sells the generation step first and the argument second.
 */
export const CASES: CaseFixture[] = [risingSunRays, starbucksKorea, greenHat];

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
