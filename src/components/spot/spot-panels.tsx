"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { missLine, type SpotKey, type SpotProgress } from "@/lib/spot";
import { EASE_OUT } from "../motion/primitives";

/** Above the picture while a case is in play: the question and how to answer, then a hint after a miss. */
export function SpotPrompt({ spot, progress, onShow }: { spot: SpotKey; progress: SpotProgress; onShow: () => void }) {
  const last = progress.misses.at(-1);
  return (
    <div className="relative px-6 pb-1 pt-5 text-center" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={progress.misses.length}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          <p className="font-serif text-[1.6rem] leading-[1.1] text-[var(--table-ink)] sm:text-[1.95rem]">
            {last ? `${missLine(spot, last)} One more try.` : "Can you spot the issue?"}
          </p>
          <p className="mx-auto mt-2 max-w-[46ch] text-[0.9rem] leading-snug text-[var(--table-dim)]">
            {last ? (
              <>
                Hint: {spot.hint}{" "}
                <button type="button" onClick={onShow} className="whitespace-nowrap text-[var(--table-pencil)] underline underline-offset-2">
                  Show me
                </button>
              </>
            ) : (
              "Flag what a local audience would object to: a spot on the ad, or a line of the brief."
            )}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Below the picture once a case is settled: the verdict, what it was and why, and where to go next. */
export function SpotResult({
  spot,
  progress,
  next,
  onRun,
}: {
  spot: SpotKey;
  progress: SpotProgress;
  next: { label: string; onClick: () => void };
  onRun: (() => void) | null;
}) {
  const body = useRef<HTMLDivElement>(null);
  const outcome = progress.outcome;
  if (!outcome) return null;
  const caught = outcome.kind === "caught";

  return (
    <motion.div
      className="relative overflow-hidden border-t border-[var(--table-rule)] bg-[var(--table)]"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      // On narrow screens the table isn't pinned; once open, make sure the answer is on screen.
      onAnimationComplete={() => body.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })}
    >
      <div ref={body} role="status" className="px-6 py-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${caught ? "bg-[var(--table-pencil)] text-[var(--table)]" : "border-2 border-[var(--table-dim)] text-[var(--table-ink)]"}`}
          >
            {caught ? (
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 12 12">
                <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <p className="font-serif text-[1.7rem] leading-none text-[var(--table-ink)]">{caught ? "Caught it." : "Here it is."}</p>
          <span className="text-[0.82rem] text-[var(--table-dim)]">{caught ? (outcome.tries === 1 ? "First try" : "Second try") : "Missed"}</span>
        </div>
        <p className="mt-3 font-medium text-[var(--table-ink)]">{spot.answer}</p>
        <p className="mt-1 max-w-[62ch] text-[0.92rem] leading-relaxed text-[var(--table-dim)]">{spot.why}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={next.onClick}
            className="rounded-[6px] bg-[var(--table-ink)] px-4 py-2.5 text-[0.95rem] font-medium text-[var(--table)] transition-colors hover:bg-white"
          >
            {next.label}
          </button>
          {onRun && (
            <button type="button" onClick={onRun} className="text-[0.95rem] text-[var(--table-pencil)] underline underline-offset-4">
              Run a second look
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
