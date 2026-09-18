"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const PENCIL = "#2750b8";
const HALO = "#fbfbf9";
const RING = 84;

/** True on devices without hover (phones, tablets), where the picture is tapped. */
function useTouchOnly(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(hover: none)");
    const update = () => setTouch(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return touch;
}

function Ring({ pressed }: { pressed?: number[] }) {
  return (
    <motion.span
      className="absolute block rounded-full"
      style={{
        width: RING,
        height: RING,
        left: -RING / 2,
        top: -RING / 2,
        boxShadow: `0 0 0 2px ${HALO}, 0 0 0 4px ${PENCIL}, 0 10px 24px -8px rgba(0,0,0,0.45)`,
        background: "rgba(251,251,249,0.22)",
      }}
      animate={pressed ? { scale: pressed } : undefined}
      transition={pressed ? { duration: 6, times: [0, 0.44, 0.48, 0.54, 1], repeat: Infinity, repeatDelay: 0.4 } : undefined}
    >
      <span className="absolute left-1/2 top-[20%] h-[20%] w-[2px] -translate-x-1/2" style={{ background: PENCIL }} />
      <span className="absolute bottom-[20%] left-1/2 h-[20%] w-[2px] -translate-x-1/2" style={{ background: PENCIL }} />
      <span className="absolute left-[20%] top-1/2 h-[2px] w-[20%] -translate-y-1/2" style={{ background: PENCIL }} />
      <span className="absolute right-[20%] top-1/2 h-[2px] w-[20%] -translate-y-1/2" style={{ background: PENCIL }} />
    </motion.span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="absolute whitespace-nowrap rounded-[4px] px-2 py-1 text-[0.78rem] font-medium shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)]"
      style={{ top: RING / 2 + 12, left: 0, transform: "translateX(-50%)", background: PENCIL, color: HALO }}
    >
      {children}
    </span>
  );
}

/**
 * Shows, rather than tells, how to play: a ghost of the loupe drifts over the picture,
 * stops, clicks with a ripple, and moves on, until the player's own pointer arrives.
 * Phones get a pulsing tap target; reduced motion gets the same cue held still.
 */
export function SpotCoach() {
  const touch = useTouchOnly();
  const reduced = useReducedMotion();

  if (touch || reduced) {
    return (
      // Keyed apart from the gliding version, so none of its animated position carries over.
      <motion.span
        key="tap"
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[55%] z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {!reduced && (
          <motion.span
            className="absolute block rounded-full"
            style={{ width: RING, height: RING, left: -RING / 2, top: -RING / 2, border: `3px solid ${PENCIL}` }}
            animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <Ring />
        <Tag>{touch ? "Tap what you’d flag" : "Hover, then click to flag"}</Tag>
      </motion.span>
    );
  }

  // One loop: glide in, stop on a spot, press (with a ripple), glide on, fade.
  const loop = { duration: 6, times: [0, 0.1, 0.4, 0.58, 0.86, 1], repeat: Infinity, repeatDelay: 0.4, ease: "easeInOut" as const };
  return (
    <motion.span
      key="glide"
      aria-hidden
      className="pointer-events-none absolute z-30"
      initial={{ left: "30%", top: "74%", opacity: 0 }}
      animate={{ left: ["30%", "30%", "63%", "63%", "42%", "42%"], top: ["74%", "74%", "40%", "40%", "60%", "60%"], opacity: [0, 1, 1, 1, 1, 0] }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={loop}
    >
      <motion.span
        className="absolute block rounded-full"
        style={{ width: RING, height: RING, left: -RING / 2, top: -RING / 2, border: `3px solid ${PENCIL}` }}
        initial={{ scale: 1, opacity: 0 }}
        animate={{ scale: [1, 1, 1, 2, 2], opacity: [0, 0, 0.8, 0, 0] }}
        transition={{ duration: 6, times: [0, 0.46, 0.48, 0.62, 1], repeat: Infinity, repeatDelay: 0.4 }}
      />
      <Ring pressed={[1, 1, 0.84, 1, 1]} />
      <Tag>Hover, then click to flag</Tag>
    </motion.span>
  );
}
