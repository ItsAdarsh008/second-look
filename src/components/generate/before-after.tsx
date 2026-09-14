"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

/** Draggable before/after comparison. A native range input drives it, so keyboard and touch work. */
export function BeforeAfter({ before, after, afterLabel = "Alternative to consider" }: { before: string; after: string; afterLabel?: string }) {
  const [position, setPosition] = useState(100);
  const [ratio, setRatio] = useState(4 / 5);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { once: true, margin: "0px 0px -20% 0px" });
  const reduced = useReducedMotion();
  const touched = useRef(false);

  // First sight: wipe the original away to reveal the alternative, then settle in the middle.
  useEffect(() => {
    if (!inView || touched.current) return;
    if (reduced) {
      setPosition(50);
      return;
    }
    const controls = animate(100, 50, {
      duration: 1.6,
      ease: [0.65, 0, 0.35, 1],
      delay: 0.3,
      onUpdate: (v) => {
        if (!touched.current) setPosition(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, reduced]);

  return (
    <div ref={root}>
      <div
        className="relative w-full select-none overflow-hidden rounded-[4px] border border-rule bg-sheet has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-pencil"
        style={{ aspectRatio: ratio }}
      >
        <Image
          src={after}
          alt={afterLabel}
          fill
          unoptimized
          sizes="(min-width: 1024px) 640px, 100vw"
          className="object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
          }}
        />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <Image src={before} alt="Original creative" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-contain" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-paper shadow-[0_0_0_1px_var(--ink)]" style={{ left: `calc(${position}% - 1px)` }}>
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink bg-paper text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M6 3L2 8l4 5M10 3l4 5-4 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </div>
        <span className="pointer-events-none absolute left-2 top-2 rounded-[3px] bg-paper/90 px-2 py-0.5 text-[0.8rem] text-ink">Original</span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-[3px] bg-ink px-2 py-0.5 text-[0.8rem] text-paper">{afterLabel}</span>
        <label htmlFor={id} className="sr-only">
          Drag to compare the original with the alternative
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => {
            touched.current = true;
            setPosition(Number(e.target.value));
          }}
          aria-valuetext={`${position}% original`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
    </div>
  );
}
