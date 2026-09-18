import type { CaseFixture } from "@/lib/schema";
import type { SpotKey } from "@/lib/spot";

/**
 * Rounds in play order. The two picture risks come first, so by the last round the
 * player is hunting in the image, which is exactly where the real failure wasn't.
 */
export const SPOT_KEYS: readonly SpotKey[] = [
  {
    slug: "green-hat",
    regions: [[0.345, 0.18, 0.31, 0.14]],
    lines: [],
    answer: "The green hat.",
    why: "In Chinese, a man who “wears a green hat” (戴绿帽子) is one whose partner is cheating on him. On the model in a menswear ad, the hat becomes the joke.",
  },
  {
    slug: "rising-sun-rays",
    regions: [[0.139, 0.104, 0.722, 0.563]],
    lines: [],
    answer: "The sunrise.",
    why: "Red rays around a red disc is the Rising Sun flag, the ensign of Imperial Japan's military. In Korea and China it carries the weight of colonial rule and wartime atrocities; Nike Korea pulled a sneaker over it in 2016, and Liverpool FC apologized to Korean fans in 2019.",
  },
  {
    slug: "starbucks-korea",
    regions: [],
    lines: [
      { field: "productName", excerpt: "Tank" },
      { field: "headline", excerpt: "Thwack" },
      { field: "bodyCopy", excerpt: "Tank Day, May 18" },
      { field: "launchDate" },
    ],
    answer: "The name, the date and the slogan.",
    why: "May 18 is the anniversary of the 1980 Gwangju Uprising, when martial-law troops sent tanks against protesters. “Thwack it on the table” echoes the police account of Park Jong-chul's death under torture in 1987. This is Starbucks Korea's real campaign, rebuilt: it was pulled within hours and the CEO was fired.",
  },
];

export interface SpotRound extends SpotKey {
  title: string;
  kind: CaseFixture["kind"];
  input: CaseFixture["input"];
}

/** Join each answer key to its case. Keys whose case isn't shown are dropped. */
export function toSpotRounds(cases: readonly CaseFixture[]): SpotRound[] {
  return SPOT_KEYS.flatMap((key) => {
    const c = cases.find((x) => x.slug === key.slug);
    return c ? [{ ...key, title: c.title, kind: c.kind, input: c.input }] : [];
  });
}

export function spotKey(slug: string): SpotKey | null {
  return SPOT_KEYS.find((k) => k.slug === slug) ?? null;
}
