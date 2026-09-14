"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Fade and rise into place the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </Tag>
  );
}

const lineVariants: Variants = {
  hidden: { y: "105%" },
  shown: (i: number) => ({ y: "0%", transition: { duration: 0.9, ease: EASE_OUT, delay: 0.08 * i } }),
};

/** Headline lines rise out of a mask, one after another. Pass each visual line as a string. */
export function MaskedLines({
  lines,
  className,
  lineClassName,
  delay = 0,
  inView = false,
}: {
  lines: readonly React.ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  inView?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const show = inView ? seen : true;
  return (
    <span ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={`block ${lineClassName ?? ""}`}
            variants={lineVariants}
            initial="hidden"
            animate={show ? "shown" : "hidden"}
            custom={i + delay / 0.08}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Masked line rise for above-the-fold headings: pure CSS, so it starts at first paint. */
export function RiseLines({ lines, delayMs = 0, stepMs = 70 }: { lines: readonly React.ReactNode[]; delayMs?: number; stepMs?: number }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <span className="rise-line block" style={{ animationDelay: `${delayMs + i * stepMs}ms` }}>
            {line}
          </span>
        </span>
      ))}
    </>
  );
}

/** A number that counts up when it first appears. */
export function CountUp({ value, className, duration = 0.9 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => rounded.on("change", (v) => setDisplay(v)), [rounded]);
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, value, duration, mv, reduced]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

/**
 * Types text into place, fast. Used when an example campaign is loaded so the
 * brief visibly fills in. Screen readers get the final value immediately.
 */
export function useTypewriter(target: string, fillKey: number, delayMs = 0): { text: string; typing: boolean } {
  const reduced = useReducedMotion();
  const [partial, setPartial] = useState<string | null>(null);
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  });

  // Runs only when a new fill is requested (fillKey > 0 changes), never on ordinary edits.
  useEffect(() => {
    const target = targetRef.current;
    if (fillKey === 0 || reduced || target.length === 0) return;

    let i = 0;
    const step = Math.max(1, Math.ceil(target.length / 40));
    let interval: ReturnType<typeof setInterval> | undefined;
    setPartial("");
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += step;
        if (i >= target.length) {
          clearInterval(interval);
          setPartial(null);
        } else {
          setPartial(target.slice(0, i));
        }
      }, 14);
    }, delayMs);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
      setPartial(null);
    };
  }, [fillKey, delayMs, reduced]);

  return { text: partial ?? target, typing: partial !== null };
}
