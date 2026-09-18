"use client";

import { animate, MotionConfig, useReducedMotion } from "motion/react";
import { useCallback } from "react";
import { EASE_OUT } from "./primitives";

/**
 * Motion config that honours reduced motion: with `prefers-reduced-motion: reduce`,
 * Motion drops transform animations and keeps only opacity changes.
 *
 * Wheel and touch scrolling are native. A JS smooth-scroll layer puts all scrolling on
 * the main thread, where it lags behind the wheel and stutters whenever React is busy.
 */
export function MotionProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 32 }}>
      {children}
    </MotionConfig>
  );
}

const USER_INPUT = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/**
 * Scroll an element to the top of the viewport, `offset` pixels from it.
 *
 * Animated frame by frame rather than with `behavior: "smooth"`: when Motion measures an
 * animation (a height of "auto", say) it restores the scroll position, which cancels a
 * native smooth scroll partway. Any wheel, touch or key input hands control back at once.
 */
export function useScrollTo() {
  const reduced = useReducedMotion();
  return useCallback(
    (target: HTMLElement | null, offset = -16) => {
      if (!target) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const to = Math.max(0, Math.min(max, target.getBoundingClientRect().top + window.scrollY + offset));
      if (reduced) {
        window.scrollTo(0, to);
        return;
      }
      const controls = animate(window.scrollY, to, {
        duration: 0.9,
        ease: EASE_OUT,
        onUpdate: (y) => window.scrollTo(0, y),
        onComplete: () => release(),
      });
      const stop = () => {
        controls.stop();
        release();
      };
      const release = () => USER_INPUT.forEach((e) => window.removeEventListener(e, stop));
      USER_INPUT.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    },
    [reduced],
  );
}
