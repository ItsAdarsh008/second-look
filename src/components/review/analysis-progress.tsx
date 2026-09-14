"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { AnalyzeStreamEvent } from "@/lib/analyze-stream";
import { describeOffsetText } from "@/lib/format";
import { marketName } from "@/lib/schema";
import { EASE_OUT } from "../motion/primitives";

type Retrieval = Extract<AnalyzeStreamEvent, { stage: "retrieval" }>;
type Calendar = Extract<AnalyzeStreamEvent, { stage: "calendar" }>;

export interface ProgressState {
  retrieval: Retrieval | null;
  calendar: Calendar | null;
  creative: boolean;
  model: { model: string; attempt: number } | null;
  validating: boolean;
  startedAt: number;
}

export const INITIAL_PROGRESS = (): ProgressState => ({
  retrieval: null,
  calendar: null,
  creative: false,
  model: null,
  validating: false,
  startedAt: Date.now(),
});

export function reduceProgress(state: ProgressState, event: AnalyzeStreamEvent): ProgressState {
  switch (event.stage) {
    case "retrieval":
      return { ...state, retrieval: event };
    case "calendar":
      return { ...state, calendar: event };
    case "creative":
      return { ...state, creative: true };
    case "model":
      return { ...state, model: { model: event.model, attempt: event.attempt } };
    case "validating":
      return { ...state, validating: true };
    default:
      return state;
  }
}

/** What the light table's footer says while each stage runs. */
export function progressCaption(p: ProgressState): { caption: string; ticker: string[] } {
  const incidents = p.retrieval?.incidents.map((i) => `${i.brand}, ${i.title} (${i.year})`) ?? [];
  const dates = p.calendar?.hits.map((h) => `${h.label}, ${marketName(h.market)}`) ?? [];
  if (p.validating) return { caption: "Checking grounding", ticker: ["Every finding needs a precedent"] };
  if (p.model) return { caption: "Cross-referencing", ticker: ["Name", "Headline", "Body copy", "Launch date", "Image", "All of it together", ...dates] };
  if (p.creative) return { caption: "Reading the creative", ticker: ["Symbols", "Gestures", "Colour", "Text in the image", "People"] };
  if (p.calendar) return { caption: "Checking the calendar", ticker: dates.length ? dates : ["No sensitive dates within a week"] };
  if (p.retrieval) return { caption: "Retrieving precedent", ticker: incidents.length ? incidents : ["No close precedent in the corpus"] };
  return { caption: "Starting", ticker: [] };
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{Math.max(0, Math.round((now - since) / 1000))}s</span>;
}

type StageStatus = "pending" | "active" | "done";

function Marker({ n, status }: { n: number; status: StageStatus }) {
  return (
    <span aria-hidden className="relative flex h-7 w-7 items-center justify-center">
      <svg className="absolute inset-0" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="none" stroke="var(--rule)" strokeWidth="1.5" />
        {status === "active" && (
          <motion.circle
            cx="14"
            cy="14"
            r="13"
            fill="none"
            stroke="var(--pencil)"
            strokeWidth="1.5"
            strokeDasharray="20 62"
            animate={{ rotate: 360 }}
            style={{ originX: "50%", originY: "50%" }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
          />
        )}
        <motion.circle
          cx="14"
          cy="14"
          r="13"
          fill="var(--ink)"
          initial={false}
          animate={{ scale: status === "done" ? 1 : 0 }}
          style={{ originX: "50%", originY: "50%" }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
        />
      </svg>
      <AnimatePresence mode="wait" initial={false}>
        {status === "done" ? (
          <motion.svg key="tick" width="12" height="12" viewBox="0 0 12 12" className="relative text-paper">
            <motion.path d="M2 6.5l2.5 2.5L10 3" fill="none" stroke="currentColor" strokeWidth="1.8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
          </motion.svg>
        ) : (
          <motion.span key="n" className={`relative text-[0.78rem] font-semibold ${status === "active" ? "text-pencil" : "text-ink-3"}`}>
            {n}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function Stage({ n, title, status, last, children }: { n: number; title: string; status: StageStatus; last?: boolean; children?: React.ReactNode }) {
  return (
    <li className="relative grid grid-cols-[1.75rem_1fr] gap-x-3.5 pb-5">
      {!last && (
        <span aria-hidden className="absolute left-[0.8125rem] top-8 bottom-1 w-px bg-rule">
          <motion.span className="absolute inset-x-0 top-0 block origin-top bg-ink" initial={false} animate={{ scaleY: status === "done" ? 1 : 0 }} style={{ height: "100%" }} transition={{ duration: 0.5, ease: EASE_OUT }} />
        </span>
      )}
      <Marker n={n} status={status} />
      <div className="min-w-0 pt-0.5">
        <p className={`font-medium ${status === "pending" ? "text-ink-3" : "text-ink"}`}>
          {title}
          <span className="sr-only">{status === "done" ? " (done)" : status === "active" ? " (in progress)" : " (waiting)"}</span>
        </p>
        <AnimatePresence>
          {children && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.35, ease: EASE_OUT }} className="overflow-hidden">
              <div className="pt-1.5 text-[0.9rem] text-ink-2">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

const listItem = {
  hidden: { opacity: 0, x: -8 },
  shown: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

export function AnalysisProgress({ progress }: { progress: ProgressState }) {
  const { retrieval, calendar, creative, model, validating } = progress;
  const status = (done: boolean, active: boolean): StageStatus => (done ? "done" : active ? "active" : "pending");

  return (
    <section aria-labelledby="progress-title">
      <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <h2 id="progress-title" className="font-serif text-[1.9rem] leading-tight">
          Taking a second look
        </h2>
        <span className="text-sm text-ink-3">
          <Elapsed since={progress.startedAt} />
        </span>
      </div>

      <ol className="mt-5" aria-live="polite" aria-busy={!validating}>
        <Stage n={1} title="Retrieving precedent" status={status(Boolean(retrieval), !retrieval)}>
          {retrieval &&
            (retrieval.incidents.length === 0 ? (
              <p>No documented incidents matched these markets or words. The review leans on the model&rsquo;s own knowledge of each market.</p>
            ) : (
              <ul className="space-y-0.5">
                {retrieval.incidents.slice(0, 4).map((i, n) => (
                  <motion.li key={i.id} variants={listItem} initial="hidden" animate="shown" custom={n} className="truncate">
                    <span className="text-ink">{i.brand}</span>, {i.title} ({i.year})
                    {i.matchedSignals.length > 0 && <span className="text-pencil"> matched “{i.matchedSignals[0]}”</span>}
                  </motion.li>
                ))}
                {retrieval.incidents.length > 4 && <li className="text-ink-3">and {retrieval.incidents.length - 4} more</li>}
              </ul>
            ))}
        </Stage>

        <Stage n={2} title="Checking the market calendar" status={status(Boolean(calendar), Boolean(retrieval) && !calendar)}>
          {calendar &&
            (calendar.launchDate === null ? (
              <p>No launch date given, so timing wasn&rsquo;t checked.</p>
            ) : calendar.hits.length === 0 ? (
              <p>No listed sensitive dates within a week of launch.</p>
            ) : (
              <ul className="space-y-0.5">
                {calendar.hits.map((h, n) => (
                  <motion.li key={h.entryId} variants={listItem} initial="hidden" animate="shown" custom={n}>
                    <span className={h.gravity === "solemn" ? "font-medium text-critical" : "text-ink"}>{h.label}</span>: {describeOffsetText(h)}
                  </motion.li>
                ))}
              </ul>
            ))}
        </Stage>

        <Stage n={3} title="Reading the creative" status={status(Boolean(model), creative && !model)} />

        <Stage n={4} title="Cross-referencing name, copy, date and image" status={status(validating, Boolean(model) && !validating)}>
          {model && !validating && (
            <p>{model.attempt > 1 ? "The first review came back malformed; asking for a corrected one." : "Each element on its own, then in combination, for every market."}</p>
          )}
        </Stage>

        <Stage n={5} title="Checking every finding is grounded" status={status(false, validating)} last />
      </ol>
    </section>
  );
}
