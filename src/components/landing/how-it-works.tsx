"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { MaskedLines, Reveal } from "../motion/primitives";

const steps = (incidents: number, dates: number, markets: number) => [
  {
    title: "Retrieve precedent",
    body: "Documented campaign failures are ranked against the campaign's markets and wording. The analyst gets them as reference, not a checklist.",
    detail: `${incidents} documented incidents`,
  },
  {
    title: "Check the calendar",
    body: "The launch date is crossed against each market's memorial, political and religious calendar. Moving holidays are flagged for local verification.",
    detail: `${dates} dates across ${markets} markets`,
  },
  {
    title: "Read it together",
    body: "Claude examines the name, headline, body copy, date, channel and image on their own, then in combination, and names the exact referent for anything it flags.",
    detail: "Every finding cites its grounding",
  },
  {
    title: "Draft an alternative",
    body: "Findings that live in the picture compile into an art-direction note for the Magic Hour API. Copy and timing findings stay on screen.",
    detail: "The request is shown in full",
  },
];

export function HowItWorks({ incidents, dates, markets }: { incidents: number; dates: number; markets: number }) {
  const STEPS = steps(incidents, dates, markets);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section ref={ref} aria-labelledby="how-title" className="border-b border-rule">
      <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-8 lg:py-28">
        <h2 id="how-title" className="max-w-[18ch] font-serif text-[2.6rem] leading-[1] tracking-tight sm:text-[3.8rem]">
          <MaskedLines lines={["A campaign is more", "than its picture."]} inView />
        </h2>

        <div className="relative mt-14">
          <div aria-hidden className="absolute left-0 right-0 top-[0.9rem] hidden h-px bg-rule lg:block">
            <motion.div className="h-full origin-left bg-ink" style={{ scaleX: progress }} />
          </div>
          <div aria-hidden className="absolute bottom-0 left-[0.9rem] top-0 w-px bg-rule lg:hidden">
            <motion.div className="w-full origin-top bg-ink" style={{ scaleY: progress, height: "100%" }} />
          </div>

          <ol className="grid gap-10 pl-10 lg:grid-cols-4 lg:gap-8 lg:pl-0">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 0.1} className="relative">
                <span aria-hidden className="absolute -left-10 top-0 flex h-[1.8rem] w-[1.8rem] items-center justify-center rounded-full border border-ink bg-paper text-[0.8rem] font-semibold lg:static lg:mb-6">
                  {i + 1}
                </span>
                <h3 className="font-serif text-[1.8rem] leading-tight">{s.title}</h3>
                <p className="mt-3 max-w-[38ch] text-ink-2">{s.body}</p>
                <p className="mt-4 text-[0.9rem] text-pencil">{s.detail}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
