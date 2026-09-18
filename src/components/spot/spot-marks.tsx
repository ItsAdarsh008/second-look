"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { Guess, SpotKey, SpotProgress } from "@/lib/spot";

/** Every case creative is 4:5 at 1080 × 1350; marks are drawn in its pixel space. */
const W = 1080;
const H = 1350;
const PENCIL = "#2750b8";
const INK = "#17191c";
const HALO = "#fbfbf9";

const LENS = 116;
const ZOOM = 2.2;

/**
 * Makes the picture flaggable. With a mouse, the cursor becomes a reviewer's loupe that
 * magnifies what's under it, with a "Flag" tag; clicking flags the spot under the
 * crosshair. Touch taps flag directly. Enter or Space (no position) flag the picture as a whole.
 */
export function SpotTarget({ src, onGuess, disabled, onHover }: { src: string; onGuess: (g: Guess) => void; disabled: boolean; onHover?: (over: boolean) => void }) {
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label="Flag something in the picture"
      className="absolute inset-0 z-20 cursor-crosshair focus-visible:outline-offset-[-4px] disabled:pointer-events-none [@media(hover:hover)]:cursor-none"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        setLens({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onHover?.(true);
      }}
      onPointerLeave={() => {
        setLens(null);
        onHover?.(false);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onClick={(e) => {
        // Lift the loupe so the mark just made shows; it returns when the pointer moves.
        setLens(null);
        if (e.detail === 0) return onGuess({ kind: "picture" });
        const r = e.currentTarget.getBoundingClientRect();
        onGuess({ kind: "point", x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
      }}
    >
      {lens && !disabled && (
        <span aria-hidden className="pointer-events-none absolute left-0 top-0" style={{ transform: `translate(${lens.x}px, ${lens.y}px)` }}>
          <span
            className="absolute block rounded-full transition-transform duration-100"
            style={{
              width: LENS,
              height: LENS,
              left: -LENS / 2,
              top: -LENS / 2,
              transform: pressed ? "scale(0.92)" : "scale(1)",
              boxShadow: `0 0 0 2px ${HALO}, 0 0 0 4px ${PENCIL}, 0 10px 24px -8px rgba(0,0,0,0.45)`,
              backgroundColor: HALO,
              backgroundImage: `url("${src}")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${lens.w * ZOOM}px ${lens.h * ZOOM}px`,
              backgroundPosition: `${-(lens.x * ZOOM - LENS / 2)}px ${-(lens.y * ZOOM - LENS / 2)}px`,
            }}
          >
            <span className="absolute left-1/2 top-[18%] h-[22%] w-[2px] -translate-x-1/2" style={{ background: PENCIL }} />
            <span className="absolute bottom-[18%] left-1/2 h-[22%] w-[2px] -translate-x-1/2" style={{ background: PENCIL }} />
            <span className="absolute left-[18%] top-1/2 h-[2px] w-[22%] -translate-y-1/2" style={{ background: PENCIL }} />
            <span className="absolute right-[18%] top-1/2 h-[2px] w-[22%] -translate-y-1/2" style={{ background: PENCIL }} />
          </span>
          <span
            className="absolute whitespace-nowrap rounded-[4px] px-2 py-0.5 text-[0.75rem] font-medium"
            style={{ top: LENS / 2 + 10, left: 0, transform: "translateX(-50%)", background: PENCIL, color: HALO }}
          >
            Flag
          </span>
        </span>
      )}
    </button>
  );
}

function MissMark({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 22 }}
    >
      <circle cx={x} cy={y} r={30} fill={HALO} fillOpacity={0.92} stroke={INK} strokeWidth={5} />
      <path d={`M${x - 11} ${y - 11} L${x + 11} ${y + 11} M${x + 11} ${y - 11} L${x - 11} ${y + 11}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
    </motion.g>
  );
}

function HitMark({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <motion.circle
        cx={x}
        cy={y}
        r={30}
        fill="none"
        stroke={PENCIL}
        strokeWidth={6}
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 3.2, opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.g initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 520, damping: 20 }}>
        <circle cx={x} cy={y} r={32} fill={PENCIL} stroke={HALO} strokeWidth={6} />
        <path d={`M${x - 13} ${y + 1} L${x - 4} ${y + 10} L${x + 14} ${y - 10}`} fill="none" stroke={HALO} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </g>
  );
}

/**
 * What the picture shows as the player goes: an × for each wrong tap, a check where they
 * caught it, and once the case is settled, the issue boxed in blue pencil like a finding.
 */
export function SpotMarks({ spot, progress }: { spot: SpotKey; progress: SpotProgress }) {
  const settled = progress.outcome !== null;
  const hit = progress.outcome?.kind === "caught" && progress.outcome.guess.kind === "point" ? progress.outcome.guess : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden>
      {settled &&
        spot.regions.map(([x, y, w, h], i) => {
          const rect = { x: x * W, y: y * H, width: w * W, height: h * H, rx: 12 };
          const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.8, ease: [0.65, 0, 0.35, 1] as const, delay: 0.15 } };
          return (
            <g key={i}>
              <motion.rect {...rect} fill={PENCIL} initial={{ fillOpacity: 0 }} animate={{ fillOpacity: 0.1 }} transition={{ delay: 0.6 }} />
              <motion.rect {...rect} fill="none" stroke={HALO} strokeWidth={13} {...draw} />
              <motion.rect {...rect} fill="none" stroke={PENCIL} strokeWidth={7} {...draw} />
            </g>
          );
        })}
      {progress.misses.map((g, i) => (g.kind === "point" ? <MissMark key={i} x={g.x * W} y={g.y * H} /> : null))}
      {hit && <HitMark x={hit.x * W} y={hit.y * H} />}
    </svg>
  );
}
