"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { EASE_OUT } from "../motion/primitives";
import { describeRegion } from "@/lib/compile-edit-prompt";
import { addDays, formatDate } from "@/lib/format";
import { marketName, type CalendarHit, type CampaignInput, type Locus } from "@/lib/schema";
import { CreativeWithBoxes } from "./creative-boxes";

const FIELD_LABEL = { headline: "Headline", body: "Body copy", productName: "Product name" } as const;

function highlight(text: string, excerpt: string): React.ReactNode {
  const i = text.toLowerCase().indexOf(excerpt.toLowerCase());
  if (i < 0 || !excerpt) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="excerpt">{text.slice(i, i + excerpt.length)}</mark>
      {text.slice(i + excerpt.length)}
    </>
  );
}

export function CopyLocus({ locus, input }: { locus: Extract<Locus, { kind: "copy" }>; input: CampaignInput }) {
  const text = locus.field === "headline" ? input.headline : locus.field === "body" ? input.bodyCopy : input.productName;
  const contains = (s: string | undefined) => Boolean(s && s.toLowerCase().includes(locus.excerpt.toLowerCase()));
  const display = locus.field === "body" ? "text-[1.02rem]" : "font-serif text-[1.45rem] leading-snug";

  // Typed copy (case studies), the brand notes, or words the analyst read off the creative itself.
  const source = contains(text) ? "field" : contains(input.brandNotes) ? "notes" : "creative";

  return (
    <div className="rounded-[4px] border border-rule bg-sheet px-4 py-3">
      <p className="text-sm text-ink-3">
        {source === "field"
          ? `${FIELD_LABEL[locus.field]}, as submitted`
          : source === "notes"
            ? `${FIELD_LABEL[locus.field]}, from the brand notes`
            : `${FIELD_LABEL[locus.field]}, read from the creative`}
      </p>
      <p className={`mt-1 ${source === "notes" ? "text-[1.02rem]" : display}`}>
        {source === "field" ? highlight(text, locus.excerpt) : source === "notes" ? highlight(input.brandNotes ?? "", locus.excerpt) : <mark className="excerpt">{locus.excerpt}</mark>}
      </p>
    </div>
  );
}

export function ConceptLocus({ locus }: { locus: Extract<Locus, { kind: "concept" }> }) {
  return (
    <div className="border-l-2 border-rule-strong pl-4">
      <p className="text-sm text-ink-3">The campaign idea</p>
      <p className="mt-0.5 text-ink">{locus.description}</p>
    </div>
  );
}

export function ImageLocus({
  locus,
  input,
  label,
  active,
}: {
  locus: Extract<Locus, { kind: "image" }>;
  input: CampaignInput;
  label: string;
  active: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-start">
      <CreativeWithBoxes
        src={input.imageUrl}
        alt="The submitted creative"
        boxes={[{ id: "self", label, bbox: locus.bbox, description: locus.description }]}
        activeId={active ? "self" : null}
        sizes="224px"
      />
      <div>
        <p className="text-sm text-ink-3">In the image, {describeRegion(locus.bbox)}</p>
        <p className="mt-0.5 text-ink">{locus.description}</p>
      </div>
    </div>
  );
}

/** Fifteen days around the launch, with the sensitive periods laid over them. The loudest locus on purpose. */
export function TimingLocus({
  locus,
  input,
  hits,
}: {
  locus: Extract<Locus, { kind: "timing" }>;
  input: CampaignInput;
  hits: readonly CalendarHit[];
}) {
  const launch = input.launchDate ?? locus.date;
  const days = Array.from({ length: 15 }, (_, i) => addDays(launch, i - 7));
  const within = (day: string, h: CalendarHit) => day >= h.occurrence.start && day <= h.occurrence.end;
  const relevant = hits.filter((h) => days.some((d) => within(d, h)) || within(locus.date, h));
  const solemn = relevant.filter((h) => h.gravity === "solemn" || h.gravity === "contested");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });

  return (
    <div ref={ref} className="rounded-[6px] border border-critical/40 bg-critical-wash/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-sm text-ink-2">Launch date</p>
          <p className="overflow-hidden font-serif text-[3.4rem] leading-none text-critical sm:text-[4.6rem]">
            <motion.span className="block" initial={{ y: "100%" }} animate={inView ? { y: "0%" } : undefined} transition={{ duration: 0.8, ease: EASE_OUT }}>
              {formatDate(launch, { year: false, long: true })}
            </motion.span>
          </p>
        </div>
        <p className="max-w-[40ch] text-[0.98rem] text-ink">{locus.reason}</p>
      </div>

      {/*
        overflow-x-auto alone computes overflow-y to auto, so the launch cell's outline and its
        scale-1.6 entrance spring were enough to raise a vertical scrollbar on a strip that only
        ever scrolls sideways. Pin the y axis shut, and pad it so nothing that overshoots gets
        clipped (the padding comes back out of the top margin).
      */}
      <div className="mt-3 overflow-x-auto overflow-y-hidden py-2">
        <ol className="grid min-w-[36rem] grid-cols-[repeat(15,minmax(0,1fr))] gap-px bg-rule" aria-label={`Fifteen days around ${formatDate(launch)}`}>
          {days.map((day, i) => {
            const isLaunch = day === launch;
            const dayHits = relevant.filter((h) => within(day, h));
            const heavy = dayHits.some((h) => h.gravity === "solemn" || h.gravity === "contested");
            const estimated = dayHits.length > 0 && dayHits.every((h) => h.needsVerification);
            const d = Number(day.slice(8, 10));
            const cascade = 0.25 + i * 0.035;
            return (
              <motion.li
                key={day}
                initial={isLaunch ? { opacity: 0, scale: 1.6 } : { opacity: 0, y: -10 }}
                animate={inView ? (isLaunch ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }) : undefined}
                transition={isLaunch ? { type: "spring", stiffness: 520, damping: 18, delay: 0.25 + 15 * 0.035 + 0.1 } : { duration: 0.35, ease: EASE_OUT, delay: cascade }}
                className={`relative flex min-h-16 flex-col justify-between px-1 py-1.5 text-center ${isLaunch ? "z-10" : ""} ${
                  heavy
                    ? estimated
                      ? "bg-critical-wash [background-image:repeating-linear-gradient(135deg,transparent_0_4px,var(--rule-strong)_4px_5px)]"
                      : "bg-critical text-critical-ink"
                    : dayHits.length
                      ? "bg-pencil-wash"
                      : "bg-sheet"
                } ${isLaunch ? "outline outline-[3px] -outline-offset-[3px] outline-ink" : ""}`}
              >
                <span className="text-[0.68rem] opacity-80" aria-hidden>
                  {d === 1 || day === days[0] ? formatDate(day, { year: false }).split(" ")[0] : " "}
                </span>
                <span className="text-[1.05rem] font-semibold tabular-nums" aria-hidden>
                  {d}
                </span>
                <span className="sr-only">
                  {formatDate(day)}
                  {isLaunch ? ", launch day" : ""}
                  {dayHits.length ? `, ${dayHits.map((h) => h.label).join(", ")}` : ""}
                </span>
                <span className="text-[0.66rem] font-semibold leading-none" aria-hidden>
                  {isLaunch ? "Launch" : " "}
                </span>
                {isLaunch && heavy && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute -inset-1 border-2 border-critical"
                    initial={{ opacity: 0, scale: 1 }}
                    animate={inView ? { opacity: [0, 0.9, 0], scale: [1, 1.35, 1.6] } : undefined}
                    transition={{ duration: 0.9, delay: 0.25 + 15 * 0.035 + 0.3, ease: "easeOut" }}
                  />
                )}
              </motion.li>
            );
          })}
        </ol>
      </div>

      {relevant.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-[0.95rem]">
          {relevant.map((h) => (
            <li key={h.entryId} className="flex flex-wrap gap-x-2">
              <span className={`font-medium ${solemn.includes(h) ? "text-critical" : "text-ink"}`}>{h.label}</span>
              <span className="text-ink-2">
                {marketName(h.market)}, {h.occurrence.start === h.occurrence.end ? formatDate(h.occurrence.start) : `${formatDate(h.occurrence.start, { year: false })} to ${formatDate(h.occurrence.end)}`}
                {h.needsVerification ? " (estimated; verify locally)" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
