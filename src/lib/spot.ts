/** A brief line the player can flag. */
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
  /** Shown after a wrong guess: a nudge, not the answer. */
  hint: string;
  /** The answer in a few words. */
  answer: string;
  /** Why a local audience would see it, with the precedent. */
  why: string;
}

/** A spot on the picture, the picture in general (keyboard), or a line of the brief. */
export type Guess = { kind: "point"; x: number; y: number } | { kind: "picture" } | { kind: "line"; field: SpotField };

export const MAX_TRIES = 2;

export type SpotOutcome = { kind: "caught"; guess: Guess; tries: number } | { kind: "shown" };

/** One case's play so far: wrong guesses, then caught or shown. */
export interface SpotProgress {
  misses: readonly Guess[];
  outcome: SpotOutcome | null;
}

export const NEW_PROGRESS: SpotProgress = { misses: [], outcome: null };

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
  }
}

/** Apply a guess, or "show me". A finished case doesn't change. */
export function stepSpot(key: SpotKey, progress: SpotProgress, action: { type: "guess"; guess: Guess } | { type: "show" }): SpotProgress {
  if (progress.outcome) return progress;
  if (action.type === "show") return { ...progress, outcome: { kind: "shown" } };
  if (isHit(key, action.guess)) return { ...progress, outcome: { kind: "caught", guess: action.guess, tries: progress.misses.length + 1 } };
  const misses = [...progress.misses, action.guess];
  return { misses, outcome: misses.length >= MAX_TRIES ? { kind: "shown" } : null };
}

/** What a wrong guess gets told, while tries remain. */
export function missLine(key: SpotKey, guess: Guess): string {
  if (key.regions.length === 0 && guess.kind !== "line") return "Nothing wrong in the picture.";
  if (key.lines.length === 0 && guess.kind === "line") return "The words are fine.";
  return "Not there.";
}

export function triesLeft(progress: SpotProgress): number {
  return progress.outcome ? 0 : MAX_TRIES - progress.misses.length;
}
