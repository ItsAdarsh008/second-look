import type { SpotKey } from "@/lib/spot";

/**
 * Answer keys for "Can you spot the issue?", in play order. The two planted risks come
 * first; the real campaign comes last, where the imagery is ordinary and the risk is in
 * the words and the date printed on it.
 */
export const SPOT_KEYS: readonly SpotKey[] = [
  {
    slug: "green-hat",
    regions: [[0.345, 0.18, 0.31, 0.14]],
    lines: [],
    hint: "Read it the way a viewer in China would. Start with what he’s wearing.",
    answer: "The green hat.",
    why: "In Chinese, a man who “wears a green hat” (戴绿帽子) is one whose partner is cheating on him. On the model in a menswear ad, the hat becomes the joke.",
  },
  {
    slug: "rising-sun-rays",
    regions: [[0.139, 0.104, 0.722, 0.563]],
    lines: [],
    hint: "Look past the product. What does the background mean in Korea and China?",
    answer: "The sunrise.",
    why: "Red rays around a red disc is the Rising Sun flag, the ensign of Imperial Japan's military. In Korea and China it carries the weight of colonial rule and wartime atrocities; Nike Korea pulled a sneaker over it in 2016, and Liverpool FC apologized to Korean fans in 2019.",
  },
  {
    slug: "starbucks-korea",
    // The words printed on the ad: the TANK DAY wordmark, the 5.18 badge, the slogan and the product line.
    // The tumbler itself is ordinary, so it's left out.
    regions: [
      [0.065, 0.144, 0.805, 0.098],
      [0.731, 0.265, 0.176, 0.139],
      [0.613, 0.422, 0.352, 0.172],
      [0.1, 0.93, 0.8, 0.065],
    ],
    lines: [
      { field: "productName", excerpt: "Tank" },
      { field: "headline", excerpt: "Thwack" },
      { field: "bodyCopy", excerpt: "Tank Day, May 18" },
      { field: "launchDate" },
    ],
    hint: "The tumbler itself is fine. Read the words the way someone in Korea would, and check the date.",
    answer: "The name, the date and the slogan.",
    why: "May 18 is the anniversary of the 1980 Gwangju Uprising, when martial-law troops sent tanks against protesters. “Thwack it on the table” echoes the police account of Park Jong-chul's death under torture in 1987. This is Starbucks Korea's real campaign, rebuilt: it was pulled within hours and the CEO was fired.",
  },
];

export function spotKey(slug: string): SpotKey | null {
  return SPOT_KEYS.find((k) => k.slug === slug) ?? null;
}

/** Position in play order; cases without a key sort last. */
export function spotOrder(slug: string): number {
  const i = SPOT_KEYS.findIndex((k) => k.slug === slug);
  return i < 0 ? SPOT_KEYS.length : i;
}
