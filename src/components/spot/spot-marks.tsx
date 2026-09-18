"use client";

import { motion } from "motion/react";
import type { Guess, Region } from "@/lib/spot";

/** Every case creative is 4:5 at 1080 × 1350; marks are drawn in its pixel space. */
const W = 1080;
const H = 1350;

/**
 * Makes the picture tappable for a guess. Pointer taps mark a spot; Enter or Space
 * (which carry no position) mean "somewhere in the picture". Sits over the image.
 */
export function SpotTarget({ onGuess, disabled }: { onGuess: (g: Guess) => void; disabled: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label="Flag something in the picture"
      className="absolute inset-0 z-10 cursor-crosshair focus-visible:outline-offset-[-4px] disabled:pointer-events-none"
      onClick={(e) => {
        if (e.detail === 0) return onGuess({ kind: "picture" });
        const r = e.currentTarget.getBoundingClientRect();
        onGuess({ kind: "point", x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
      }}
    />
  );
}

/**
 * The reveal: the answer boxed in blue pencil, as findings are, and the player's tap as
 * a black ring. Fixed colours with a white halo so both read on any creative.
 */
export function SpotMarks({ regions, guess }: { regions: readonly Region[]; guess: Guess }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden>
      {regions.map(([x, y, w, h], i) => {
        const rect = { x: x * W, y: y * H, width: w * W, height: h * H, rx: 12 };
        const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.8, ease: [0.65, 0, 0.35, 1] as const, delay: 0.1 } };
        return (
          <g key={i}>
            <rect {...rect} fill="#2750b8" fillOpacity={0.1} />
            <motion.rect {...rect} fill="none" stroke="#fbfbf9" strokeWidth={13} {...draw} />
            <motion.rect {...rect} fill="none" stroke="#2750b8" strokeWidth={7} {...draw} />
          </g>
        );
      })}
      {guess.kind === "point" && (
        <motion.g initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 24 }}>
          <circle cx={guess.x * W} cy={guess.y * H} r={34} fill="none" stroke="#fbfbf9" strokeWidth={13} />
          <circle cx={guess.x * W} cy={guess.y * H} r={34} fill="none" stroke="#17191c" strokeWidth={6} />
          <circle cx={guess.x * W} cy={guess.y * H} r={6} fill="#17191c" />
        </motion.g>
      )}
    </svg>
  );
}

/** What the table caption says once the answer is drawn. */
export function marksCaption(regions: readonly Region[], guess: Guess): string {
  if (regions.length === 0) return "Nothing in the picture to mark.";
  return guess.kind === "point" ? "Blue box: the issue. Black ring: your tap." : "Blue box: the issue.";
}
