"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { MotionConfig } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import "lenis/dist/lenis.css";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Lenis smooth scrolling plus a Motion config that honours reduced motion.
 * With `prefers-reduced-motion: reduce`, Lenis isn't mounted at all and Motion
 * drops transform animations, keeping only opacity changes.
 */
export function MotionProviders({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 32 }}>
      {reduced ? (
        children
      ) : (
        // Nested scroll areas opt out with data-lenis-prevent, which Lenis honours natively.
        <ReactLenis root options={{ autoRaf: true, lerp: 0.1, anchors: true }}>
          {children}
        </ReactLenis>
      )}
    </MotionConfig>
  );
}

/** Scroll to an element through Lenis when it's running, natively otherwise. */
export function useScrollTo() {
  const lenis = useLenis();
  return useCallback(
    (target: HTMLElement | null, offset = -16) => {
      if (!target) return;
      if (lenis) lenis.scrollTo(target, { offset, duration: 1.1 });
      else target.scrollIntoView({ block: "start" });
    },
    [lenis],
  );
}
