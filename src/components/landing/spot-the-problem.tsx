"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { creativeUrl } from "@/data/cases/creative";
import type { SpotRound } from "@/data/spot";
import { formatDate } from "@/lib/format";
import { CHANNEL_LABELS, marketName, type CampaignInput } from "@/lib/schema";
import { isHit, verdictLine, type Guess, type SpotField } from "@/lib/spot";
import { EASE_OUT, MaskedLines } from "../motion/primitives";
import { useScrollTo } from "../motion/providers";
import { openCaseInTool } from "../review/review-app";
import { marksCaption, SpotMarks, SpotTarget } from "../spot/spot-marks";

const FIELDS: readonly SpotField[] = ["productName", "headline", "bodyCopy", "launchDate"];
const FIELD_LABEL: Record<SpotField, string> = { productName: "Product name", headline: "Headline", bodyCopy: "Body copy", launchDate: "Launch date" };
const COUNT_WORD: Record<number, string> = { 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five" };

function lineValue(input: CampaignInput, field: SpotField): string | null {
  if (field === "launchDate") return input.launchDate ? formatDate(input.launchDate, { long: true }) : null;
  return input[field] || null;
}

function marked(text: string, excerpt: string | undefined): React.ReactNode {
  if (!excerpt) return <mark className="excerpt">{text}</mark>;
  const i = text.toLowerCase().indexOf(excerpt.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="excerpt">{text.slice(i, i + excerpt.length)}</mark>
      {text.slice(i + excerpt.length)}
    </>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" className={className} aria-hidden>
      <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Cross({ className }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" className={className} aria-hidden>
      <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** One square per round: caught, missed, current or still to come. */
function Tally({ results, current }: { results: readonly (boolean | null)[]; current: number }) {
  const caught = results.filter((r) => r === true).length;
  return (
    <div className="flex items-center gap-3">
      <ol className="flex gap-1.5" aria-hidden>
        {results.map((r, i) => (
          <li
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-[4px] border transition-colors duration-300 ${
              r === true ? "border-ink bg-ink text-paper" : r === false ? "border-rule-strong text-ink-3" : i === current ? "border-ink" : "border-rule"
            }`}
          >
            {r === true ? <Check /> : r === false ? <Cross /> : null}
          </li>
        ))}
      </ol>
      <p className="text-[0.88rem] tabular-nums text-ink-3" aria-live="polite">
        {caught} of {results.length} caught
      </p>
    </div>
  );
}

/** The creative on the light table. Pointer taps mark a spot; keyboard activation means "somewhere in the picture". */
function Board({ round, guess, onGuess, index, total }: { round: SpotRound; guess: Guess | null; onGuess: (g: Guess) => void; index: number; total: number }) {
  const revealed = guess !== null;
  return (
    <div className="light-table rounded-[10px]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--table-rule)] px-5 py-3 text-[0.82rem] text-[var(--table-dim)]">
        <span>
          Round {index + 1} of {total}
        </span>
        <span>{revealed ? "Revealed" : "Tap to mark"}</span>
      </div>
      <div className="px-8 py-8 sm:px-12 sm:py-10">
        <div className="relative mx-auto w-full max-w-[24rem]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] shadow-[0_0_0_1px_var(--table-rule)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={round.slug}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.05, rotate: -1, y: -14 }}
                animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 10 }}
                transition={{ type: "spring", stiffness: 200, damping: 24 }}
              >
                <Image
                  src={round.input.imageUrl}
                  alt={`Ad for ${round.input.productName}`}
                  fill
                  sizes="(min-width: 1024px) 384px, 90vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>

            <SpotTarget onGuess={onGuess} disabled={revealed} />
            {guess && <SpotMarks regions={round.regions} guess={guess} />}
          </div>
        </div>
      </div>
      <p className="border-t border-[var(--table-rule)] px-5 py-3 text-[0.85rem] text-[var(--table-dim)]" aria-live="polite">
        {revealed ? marksCaption(round.regions, guess) : "Tap the spot you’d flag, or pick a line of the brief."}
      </p>
    </div>
  );
}

function Recap({ rounds, results, markets, onReplay }: { rounds: readonly SpotRound[]; results: readonly (boolean | null)[]; markets: number; onReplay: () => void }) {
  const scrollTo = useScrollTo();
  const caught = results.filter((r) => r === true).length;
  const realIndex = rounds.findIndex((r) => r.kind === "incident-reconstruction");
  const missedReal = realIndex >= 0 && results[realIndex] === false;

  const [headline, body] =
    caught === rounds.length
      ? [`${COUNT_WORD[caught] ?? caught} for ${(COUNT_WORD[caught] ?? String(caught)).toLowerCase()}.`, `Now picture doing that across ${markets} markets, each with its own history, language and calendar, before every launch.`]
      : missedReal && caught === rounds.length - 1
        ? ["The one you missed is the one that happened.", "The picture risks were planted. The real failure had nothing in the picture at all, which is why Second Look reads the name, the copy and the date too."]
        : [`You caught ${caught} of ${rounds.length}.`, "These rounds come from the test set Second Look is scored on. It checks every market a campaign runs in and cites a precedent for anything it flags."];

  return (
    <motion.div
      key="recap"
      className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
    >
      <ul className="light-table grid grid-cols-3 gap-4 rounded-[10px] p-6 sm:gap-6 sm:p-10">
        {rounds.map((r, i) => (
          <li key={r.slug}>
            <div className="relative overflow-hidden rounded-[2px] shadow-[0_0_0_1px_var(--table-rule)]">
              <Image src={creativeUrl(r.slug, "thumb")} alt="" width={540} height={675} sizes="140px" className="w-full" />
              <span
                className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-[4px] ${results[i] ? "bg-ink text-paper" : "bg-sheet text-ink-3 shadow-[0_0_0_1px_var(--rule-strong)]"}`}
              >
                {results[i] ? <Check /> : <Cross />}
              </span>
            </div>
            <p className="mt-2 truncate text-[0.8rem] text-[var(--table-ink)]">{r.title}</p>
            <p className="text-[0.75rem] text-[var(--table-dim)]">{results[i] ? "Caught" : "Missed"}</p>
          </li>
        ))}
      </ul>
      <div>
        <p className="font-serif text-[2.4rem] leading-[1.05] sm:text-[3rem]">{headline}</p>
        <p className="mt-4 max-w-[52ch] text-[1.05rem] leading-relaxed text-ink-2">{body}</p>
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={() => scrollTo(document.getElementById("main"), 0)}
            className="rounded-[6px] bg-ink px-5 py-3 text-paper transition-colors hover:bg-pencil"
          >
            Review your own campaign
          </button>
          <button type="button" onClick={onReplay} className="text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink">
            Play again
          </button>
          <Link href="/cases" className="text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink">
            Browse the case studies
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * "Can you spot the issue?": the gallery cases as rounds. Tap the picture or a line of
 * the brief; the answer is drawn on like a finding, with the reason and its precedent.
 */
export function SpotTheProblem({ rounds, markets }: { rounds: readonly SpotRound[]; markets: number }) {
  const [index, setIndex] = useState(0);
  const [guesses, setGuesses] = useState<readonly (Guess | null)[]>(() => rounds.map(() => null));
  const sectionRef = useRef<HTMLElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const scrollTo = useScrollTo();

  const results = rounds.map((r, i) => {
    const g = guesses[i];
    return g ? isHit(r, g) : null;
  });
  const round = rounds[index] as SpotRound | undefined;
  const guess = guesses[index] ?? null;
  const hit = results[index] ?? null;

  // On narrow screens the verdict sits under the picture that was just tapped; bring it up.
  useEffect(() => {
    if (!guess) return;
    const t = setTimeout(() => verdictRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 250);
    return () => clearTimeout(t);
  }, [guess]);

  if (rounds.length === 0) return null;

  const onGuess = (g: Guess) => setGuesses((all) => all.map((x, i) => (i === index ? g : x)));
  const advance = (to: number) => {
    setIndex(to);
    if ((sectionRef.current?.getBoundingClientRect().top ?? 0) < 0) scrollTo(sectionRef.current, -8);
  };

  return (
    <section ref={sectionRef} aria-labelledby="spot-title" className="border-b border-rule">
      <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div>
            <h2 id="spot-title" className="font-serif text-[2.6rem] leading-[1] tracking-tight sm:text-[3.8rem]">
              <MaskedLines lines={["Can you spot", "the issue?"]} inView />
            </h2>
            <p className="mt-5 max-w-[58ch] text-[1.05rem] leading-relaxed text-ink-2">
              {COUNT_WORD[rounds.length] ?? rounds.length} campaigns from the test set, each with a risk a local audience would catch at once. Flag it
              in the picture or in the brief.
            </p>
          </div>
          <Tally results={results} current={index} />
        </div>

        <div className="mt-12">
          <AnimatePresence mode="wait" initial={false}>
            {!round ? (
              <Recap
                rounds={rounds}
                results={results}
                markets={markets}
                onReplay={() => {
                  setGuesses(rounds.map(() => null));
                  advance(0);
                }}
              />
            ) : (
              <motion.div
                key="play"
                className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Board round={round} guess={guess} onGuess={onGuess} index={index} total={rounds.length} />

                <div className="min-w-0">
                  <p className="font-serif text-[2rem] leading-tight">{round.input.brandName ?? round.input.productName}</p>
                  <p className="mt-1 text-ink-2">
                    Runs in {round.input.markets.map(marketName).join(" and ")}, {CHANNEL_LABELS[round.input.channel].toLowerCase()}
                  </p>

                  <div ref={verdictRef} aria-live="polite" className="scroll-mb-6">
                    {guess && hit !== null && (
                      <motion.div
                        key={round.slug}
                        className="mt-6 border-l-2 border-ink pl-5"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE_OUT }}
                      >
                        <p className="font-serif text-[1.9rem] leading-[1.1] sm:text-[2.2rem]">{verdictLine(round, guess)}</p>
                        <p className="mt-3 font-medium text-ink">{round.answer}</p>
                        <p className="mt-1.5 max-w-[62ch] leading-relaxed text-ink-2">{round.why}</p>
                        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                          <button type="button" onClick={() => advance(index + 1)} className="rounded-[6px] bg-ink px-5 py-3 text-paper transition-colors hover:bg-pencil">
                            {index + 1 < rounds.length ? "Next campaign" : "See how you did"}
                          </button>
                          <button type="button" onClick={() => openCaseInTool(round.slug)} className="text-pencil underline underline-offset-4">
                            Run it through Second Look
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <ul className="mt-6 divide-y divide-rule border-y border-rule">
                    {FIELDS.map((field) => {
                      const value = lineValue(round.input, field);
                      if (!value) return null;
                      const answer = guess ? round.lines.find((l) => l.field === field) : undefined;
                      const picked = guess?.kind === "line" && guess.field === field;
                      return (
                        <li key={field}>
                          <button
                            type="button"
                            disabled={guess !== null}
                            onClick={() => onGuess({ kind: "line", field })}
                            aria-label={`Flag the ${FIELD_LABEL[field].toLowerCase()}: ${value}`}
                            className={`grid w-full grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-0.5 border-l-2 py-3 pl-3 pr-2 text-left transition-colors sm:grid-cols-[7.5rem_minmax(0,1fr)] ${
                              picked ? "border-ink" : "border-transparent"
                            } ${guess ? "" : "hover:border-pencil hover:bg-pencil-wash/50"}`}
                          >
                            <span className="pt-0.5 text-[0.82rem] text-ink-3">
                              {FIELD_LABEL[field]}
                              {picked && <span className="text-ink">, your pick</span>}
                            </span>
                            <span className={field === "headline" ? "font-serif text-[1.35rem] leading-snug" : "leading-relaxed"}>
                              {answer ? marked(value, answer.excerpt) : value}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {!guess && (
                    <button type="button" onClick={() => onGuess({ kind: "fine" })} className="mt-5 rounded-[6px] border border-rule-strong px-4 py-2.5 transition-colors hover:border-ink">
                      Looks fine to me
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
