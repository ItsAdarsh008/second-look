"use client";

import { motion, useInView, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { EASE_OUT, MaskedLines, Reveal } from "../motion/primitives";

const NOTES = [
  { term: "Tank", note: "Martial-law troops sent tanks against pro-democracy protesters in Gwangju in 1980." },
  { term: "May 18", note: "The anniversary of the Gwangju Democratization Movement, a national memorial day." },
  { term: "Thwack", note: "Echoes the 1987 police account of student activist Park Jong-chul's death under torture." },
];

/** A word the reviewer circles: the blue-pencil underline draws itself when it scrolls into view. */
function Marked({ n, children, delay }: { n: number; children: React.ReactNode; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  return (
    <span ref={ref} className="relative inline-block whitespace-nowrap">
      {children}
      <svg aria-hidden className="absolute -bottom-[0.18em] left-0 h-[0.35em] w-full overflow-visible" viewBox="0 0 100 10" preserveAspectRatio="none">
        <motion.path
          d="M1 6 C 20 2, 45 9, 70 5 S 95 4, 99 6"
          fill="none"
          stroke="var(--pencil)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : undefined}
          transition={{ duration: 0.7, ease: EASE_OUT, delay }}
        />
      </svg>
      <motion.sup
        aria-hidden
        className="ml-0.5 font-sans text-[0.42em] font-semibold text-pencil"
        initial={{ opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ delay: delay + 0.5 }}
      >
        {n}
      </motion.sup>
    </span>
  );
}

export function Story() {
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const tilt = useTransform(scrollYProgress, [0, 1], [-3, 2]);

  return (
    <section ref={section} aria-labelledby="story-title" className="relative overflow-hidden border-b border-rule">
      <div className="mx-auto grid max-w-[88rem] grid-cols-[minmax(0,1fr)] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-20 lg:py-28">
        <div>
          <h2 id="story-title" className="font-serif text-[2.8rem] leading-[1] tracking-tight sm:text-[4.4rem]">
            <MaskedLines lines={["Nothing was wrong", "with the picture."]} inView />
          </h2>
          <Reveal delay={0.15}>
            <p className="mt-8 max-w-[30ch] font-serif text-[1.7rem] leading-[1.3] text-ink-2 sm:text-[2.1rem]">
              A tumbler called the{" "}
              <Marked n={1} delay={0.2}>
                Tank
              </Marked>
              , launched on{" "}
              <Marked n={2} delay={0.5}>
                May 18
              </Marked>
              , with the slogan &ldquo;
              <Marked n={3} delay={0.8}>
                Thwack
              </Marked>{" "}
              it on the table!&rdquo;
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <p className="mt-8 max-w-[58ch] text-[1.05rem] text-ink-2">
              Starbucks Korea pulled the promotion within hours and fired its CEO. Nobody in the approval chain was malicious; they didn&rsquo;t have the
              reference. The failure lived entirely in a name, a date and a slogan, which is why Second Look reads the whole campaign and not just the
              image.
            </p>
            <p className="mt-6">
              <Link href="/cases/starbucks-korea" className="text-pencil underline decoration-1 underline-offset-4 transition-[text-underline-offset] duration-300 hover:underline-offset-8">
                Read the Tank Day case study
              </Link>
            </p>
          </Reveal>
        </div>

        <div className="relative flex flex-col justify-center gap-10">
          <motion.div style={{ y: drift, rotate: tilt }} className="light-table mx-auto w-full max-w-[20rem] rounded-[10px] p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.5)]">
            <Image src="/cases/starbucks-korea.png" alt="Synthetic reconstruction of the Tank Day tumbler ad, with a fictional brand" width={1080} height={1350} className="w-full rounded-[2px]" sizes="320px" />
            <p className="mt-3 text-[0.8rem] text-[var(--table-dim)]">Rebuilt with a fictional brand. The picture is clean.</p>
          </motion.div>
          <ol className="border-l-2 border-pencil pl-5 text-[0.98rem] text-ink-2" aria-label="What each marked word refers to">
            {NOTES.map((n, i) => (
              <Reveal as="li" key={n.term} delay={0.1 * i} y={16} className="py-3 [&+li]:border-t [&+li]:border-rule">
                <span className="mr-2 font-semibold text-pencil">{i + 1}</span>
                <span className="font-semibold text-ink">{n.term}.</span> {n.note}
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
