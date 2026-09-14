"use client";

import { motion, useInView, type Variants } from "motion/react";
import { useRef, useState } from "react";
import { describeOffsetText, formatDate } from "@/lib/format";
import { CountUp, EASE_OUT, Reveal } from "../motion/primitives";
import { SEVERITY_LABEL, severityCounts, verdictLine } from "@/lib/report";
import { CHANNEL_LABELS, SEVERITIES, marketName, type AnalysisResult } from "@/lib/schema";
import { CreativeWithBoxes } from "./creative-boxes";
import { FindingCard } from "./finding-card";

export interface IncidentSummary {
  id: string;
  brand: string;
  title: string;
  year: number;
  region: string;
  sourceUrl: string;
}

function ShareButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="text-sm text-pencil underline underline-offset-2"
      onClick={async () => {
        const url = `${window.location.origin}/a/${id}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this link", url);
        }
      }}
    >
      {copied ? "Link copied" : "Copy link to this report"}
    </button>
  );
}

const wordVariants: Variants = {
  hidden: { y: "110%" },
  shown: (i: number) => ({ y: "0%", transition: { duration: 0.7, ease: EASE_OUT, delay: 0.1 + i * 0.045 } }),
};

/** The verdict sets word by word, each rising out of its own mask. */
function Verdict({ text, hold }: { text: string; hold: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  return (
    <h2 ref={ref} aria-label={text} className={`mt-1 max-w-[30ch] font-serif text-[2.4rem] leading-[1.06] sm:text-[3.2rem] ${hold ? "text-critical" : "text-ink"}`}>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden className="inline-block overflow-hidden pb-[0.1em] align-bottom">
          <motion.span className="inline-block" variants={wordVariants} initial="hidden" animate={inView ? "shown" : "hidden"} custom={i}>
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </h2>
  );
}

function ReportHeader({ result, share }: { result: AnalysisResult; share: boolean }) {
  const counts = severityCounts(result.findings);
  const hold = counts.critical > 0;
  return (
    <header className="border-b border-rule pb-6">
      <p className="text-sm text-ink-3">Report</p>
      <Verdict text={verdictLine(result.findings)} hold={hold} />
      <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
        {SEVERITIES.map((s, i) => (
          <motion.div
            key={s}
            className={counts[s] === 0 ? "text-ink-3" : "text-ink"}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 + i * 0.06, duration: 0.5, ease: EASE_OUT }}
          >
            <dt className="text-sm">{SEVERITY_LABEL[s]}</dt>
            <dd className={`mt-0.5 text-[2.1rem] font-medium leading-none tabular-nums ${s === "critical" && counts[s] > 0 ? "text-critical" : ""}`}>
              <CountUp value={counts[s]} />
            </dd>
          </motion.div>
        ))}
        <div>
          <dt className="text-sm text-ink-3">Markets analyzed</dt>
          <dd className="mt-1.5 text-ink">{result.marketsAnalyzed.map(marketName).join(", ")}</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm text-ink-3">
        <p>
          Reviewed by {result.modelUsed} on {formatDate(result.analyzedAt.slice(0, 10))}, against {result.corpusHits.length} documented{" "}
          {result.corpusHits.length === 1 ? "incident" : "incidents"} and {result.calendarHits.length} calendar{" "}
          {result.calendarHits.length === 1 ? "entry" : "entries"}.
        </p>
        {share && <ShareButton id={result.id} />}
      </div>
    </header>
  );
}

function ZeroFindings({ result, incidents }: { result: AnalysisResult; incidents: readonly IncidentSummary[] }) {
  const compared = result.corpusHits.map((id) => incidents.find((i) => i.id === id)).filter((i): i is IncidentSummary => Boolean(i));
  const { input } = result;
  const checked = [
    input.productName && `Product name “${input.productName}”`,
    input.headline && `Headline “${input.headline}”`,
    input.bodyCopy && "Body copy",
    !input.productName && !input.headline && !input.bodyCopy && "Every word in the creative",
    input.brandNotes && "Campaign details in the brand notes",
    input.launchDate ? `Launch date ${formatDate(input.launchDate)} against each market's calendar` : "No launch date given, so timing was not checked",
    `The creative image`,
    `Channel: ${CHANNEL_LABELS[input.channel]}`,
  ].filter((s): s is string => Boolean(s));

  return (
    <Reveal as="section" delay={0.3} className="mt-8 rounded-[10px] border border-rule bg-sheet p-6 sm:p-8">
      <h3 id="zero-title" className="font-serif text-[2.1rem] leading-tight">
        Nothing flagged. This is not an approval.
      </h3>
      <p className="mt-3 max-w-[64ch] text-ink-2">
        Second Look found no specific cultural referent this campaign collides with in {result.marketsAnalyzed.map(marketName).join(", ")}. That
        is a real answer, not an error. It is also only as good as what it knows: have someone who lives in each market read it before launch.
      </p>

      <div className="mt-7 grid gap-8 md:grid-cols-2">
        <div>
          <h4 className="font-medium">What was checked</h4>
          <ul className="mt-2 space-y-1 text-[0.95rem] text-ink-2">
            {checked.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          {result.calendarHits.length > 0 && (
            <>
              <h4 className="mt-5 font-medium">Dates considered and ruled out</h4>
              <ul className="mt-2 space-y-1 text-[0.95rem] text-ink-2">
                {result.calendarHits.map((h) => (
                  <li key={h.entryId}>
                    {h.label}, {marketName(h.market)}: {describeOffsetText(h)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div>
          <h4 className="font-medium">Compared against</h4>
          {compared.length === 0 ? (
            <p className="mt-2 text-[0.95rem] text-ink-2">No documented incidents matched these markets or words, so the review relied on the model&rsquo;s knowledge of each market.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-[0.95rem] text-ink-2">
              {compared.map((i) => (
                <li key={i.id}>
                  <a href={i.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-rule-strong underline-offset-2 hover:text-ink">
                    {i.brand}, {i.title}
                  </a>{" "}
                  ({i.year}, {i.region})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {result.reviewNotes && (
        <div className="mt-7 border-t border-rule pt-5">
          <h4 className="font-medium">Reviewer&rsquo;s notes</h4>
          <p className="mt-1.5 max-w-[68ch] text-ink-2">{result.reviewNotes}</p>
        </div>
      )}
    </Reveal>
  );
}

export function Report({
  result,
  incidents,
  share = true,
}: {
  result: AnalysisResult;
  incidents: readonly IncidentSummary[];
  share?: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { input, findings } = result;
  const boxes = findings.flatMap((f, i) =>
    f.locus.kind === "image" ? [{ id: f.id, label: String(i + 1), bbox: f.locus.bbox, description: f.locus.description }] : [],
  );

  return (
    <section aria-label="Analysis report">
      <ReportHeader result={result} share={share} />

      {findings.length === 0 ? (
        <ZeroFindings result={result} incidents={incidents} />
      ) : (
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ol
            className="space-y-6"
            aria-label="Findings, most severe first. Use the up and down arrow keys to move between findings."
            onKeyDown={(e) => {
              if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
              const cards = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(":scope > li > article"));
              const i = cards.findIndex((c) => c === document.activeElement);
              if (i < 0) return;
              e.preventDefault();
              const next = cards[Math.min(cards.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
              next.focus();
              next.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
            }}
          >
            {findings.map((f, i) => (
              <Reveal as="li" key={f.id} delay={Math.min(i, 3) * 0.08} y={36}>
                <FindingCard
                  finding={f}
                  index={i}
                  input={input}
                  calendarHits={result.calendarHits}
                  active={activeId === f.id}
                  onActivate={setActiveId}
                />
              </Reveal>
            ))}
          </ol>

          <aside aria-label="Campaign as submitted" className="order-first lg:order-none">
            <Reveal className="space-y-4 lg:sticky lg:top-6" delay={0.15}>
              <CreativeWithBoxes src={input.imageUrl} alt="The submitted creative" boxes={boxes} activeId={activeId} onActivate={setActiveId} loupe drawDelay={0.4} />
              <dl className="space-y-2.5 text-[0.93rem]">
                {input.brandName && (
                  <div>
                    <dt className="text-ink-3">Brand</dt>
                    <dd>{input.brandName}</dd>
                  </div>
                )}
                {input.productName && (
                  <div>
                    <dt className="text-ink-3">Product name</dt>
                    <dd>{input.productName}</dd>
                  </div>
                )}
                {input.headline && (
                  <div>
                    <dt className="text-ink-3">Headline</dt>
                    <dd className="font-serif text-[1.15rem] leading-snug">{input.headline}</dd>
                  </div>
                )}
                {!input.productName && !input.headline && (
                  <div>
                    <dt className="text-ink-3">Copy</dt>
                    <dd>Read from the creative</dd>
                  </div>
                )}
                <div>
                  <dt className="text-ink-3">Markets</dt>
                  <dd>{input.markets.map(marketName).join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Launch</dt>
                  <dd>
                    {input.launchDate ? formatDate(input.launchDate) : "No date"}, {CHANNEL_LABELS[input.channel].toLowerCase()}
                  </dd>
                </div>
              </dl>
              {result.reviewNotes && (
                <details className="text-[0.93rem] text-ink-2">
                  <summary className="cursor-pointer text-ink">Reviewer&rsquo;s notes</summary>
                  <p className="mt-1.5">{result.reviewNotes}</p>
                </details>
              )}
            </Reveal>
          </aside>
        </div>
      )}
    </section>
  );
}
