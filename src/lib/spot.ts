/** A brief line the player can point at. */
export type SpotField = "productName" | "headline" | "bodyCopy" | "launchDate";

/** [x, y, width, height], normalized 0–1 to the creative, like finding boxes. */
export type Region = readonly [number, number, number, number];

/** The answer key for one case in "Can you spot the issue?". The campaign itself comes from the case. */
export interface SpotKey {
  slug: string;
  /** Where the risk sits in the picture. Empty when the picture is clean. */
  regions: readonly Region[];
  /** Brief lines that carry the risk, and the words to mark on reveal (the whole line when omitted). */
  lines: readonly { field: SpotField; excerpt?: string }[];
  /** The answer in a few words. */
  answer: string;
  /** Why a local audience would see it, with the precedent. */
  why: string;
}

/**
 * A player's guess: a spot on the picture, the picture in general (keyboard), a line of
 * the brief, "it's in the words" without naming a line, or "looks fine".
 */
export type Guess =
  | { kind: "point"; x: number; y: number }
  | { kind: "picture" }
  | { kind: "line"; field: SpotField }
  | { kind: "words" }
  | { kind: "fine" };

/** Taps this close to a region still count, as a fraction of the image. */
const SLACK = 0.02;

function inRegion([x, y, w, h]: Region, px: number, py: number): boolean {
  return px >= x - SLACK && px <= x + w + SLACK && py >= y - SLACK && py <= y + h + SLACK;
}

export function isHit(key: SpotKey, guess: Guess): boolean {
  switch (guess.kind) {
    case "point":
      return key.regions.some((r) => inRegion(r, guess.x, guess.y));
    case "picture":
      return key.regions.length > 0;
    case "line":
      return key.lines.some((l) => l.field === guess.field);
    case "words":
      return key.lines.length > 0;
    case "fine":
      return false;
  }
}

export function verdictLine(key: SpotKey, guess: Guess): string {
  if (isHit(key, guess)) return "Caught it.";
  if (key.regions.length === 0) {
    if (guess.kind === "fine") return "That’s what the approval chain said too.";
    if (guess.kind === "point" || guess.kind === "picture") return "Nothing was wrong with the picture.";
  }
  if (guess.kind === "words") return "It’s in the picture.";
  return guess.kind === "fine" ? "There’s one here." : "Not there.";
}
