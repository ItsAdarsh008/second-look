"use client";

import { formatDate } from "@/lib/format";
import { CHANNEL_LABELS, marketName } from "@/lib/schema";
import type { Guess, SpotField, SpotKey, SpotProgress } from "@/lib/spot";
import type { BriefValues } from "../brief/brief-form";
import { useTypewriter } from "../motion/primitives";

export interface BriefSpot {
  key: SpotKey;
  progress: SpotProgress;
  onGuess: (g: Guess) => void;
}

function Marked({ text, excerpt }: { text: string; excerpt: string | undefined }) {
  const i = excerpt ? text.toLowerCase().indexOf(excerpt.toLowerCase()) : -1;
  if (!excerpt || i < 0) return <mark className="excerpt">{text}</mark>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="excerpt">{text.slice(i, i + excerpt.length)}</mark>
      {text.slice(i + excerpt.length)}
    </>
  );
}

const cell = "flex min-w-0 flex-col gap-1.5 px-4 py-3.5 text-left sm:px-5 sm:py-4";

/** A plain field: where it runs, the channel. Context for the reviewer, not something to flag. */
function Fact({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`${cell} ${className}`}>
      <span className="flex min-h-6 items-center text-[0.8rem] text-ink-3">{label}</span>
      <span className="text-[1.05rem] leading-snug text-ink">{children}</span>
    </div>
  );
}

/**
 * A line of the campaign that can be flagged while the case is in play: the whole field
 * is the target, with a Flag chip. Once settled, the words that carried the risk are marked.
 */
function Line({
  field,
  label,
  text,
  valueClass,
  delay,
  fillKey,
  spot,
  className = "",
}: {
  field: SpotField;
  label: string;
  text: string;
  valueClass: string;
  delay: number;
  fillKey: number;
  spot: BriefSpot | null;
  className?: string;
}) {
  const typed = useTypewriter(text, fillKey, delay);
  const outcome = spot?.progress.outcome ?? null;
  const answer = outcome ? spot?.key.lines.find((l) => l.field === field) : undefined;
  const missed = spot?.progress.misses.some((g) => g.kind === "line" && g.field === field) ?? false;
  const caughtHere = outcome?.kind === "caught" && outcome.guess.kind === "line" && outcome.guess.field === field;
  const flaggable = spot !== null && outcome === null && !missed;

  const status = flaggable ? (
    <span className="rounded-[4px] border border-pencil/35 px-1.5 py-0.5 text-[0.74rem] font-medium text-pencil transition-colors group-hover:border-pencil group-hover:bg-pencil group-hover:text-paper group-focus-visible:border-pencil group-focus-visible:bg-pencil group-focus-visible:text-paper">
      Flag
    </span>
  ) : caughtHere ? (
    <span className="text-[0.78rem] font-medium text-pencil">Caught</span>
  ) : missed ? (
    <span className="text-[0.78rem] text-ink-3">Not this one</span>
  ) : null;

  const body = (
    <>
      <span className="flex min-h-6 items-center justify-between gap-3">
        <span className="text-[0.8rem] text-ink-3">{label}</span>
        {status}
      </span>
      <span className={`${valueClass} ${missed && !answer ? "line-through decoration-ink-3/60" : ""}`}>
        <span aria-hidden>{answer ? <Marked text={text} excerpt={answer.excerpt} /> : typed.text}</span>
        <span className="sr-only">{text}</span>
      </span>
    </>
  );

  if (flaggable) {
    return (
      <button
        type="button"
        onClick={() => spot.onGuess({ kind: "line", field })}
        aria-label={`Flag the ${label.toLowerCase()}: ${text}`}
        className={`group ${cell} ${className} transition-colors hover:bg-pencil-wash focus-visible:bg-pencil-wash`}
      >
        {body}
      </button>
    );
  }
  return <div className={`${cell} ${className}`}>{body}</div>;
}

/**
 * A case's brief as a sheet of fields: where and when it runs, then the words, each with
 * room to read. While the case is in play every line can be flagged.
 */
export function CaseBrief({ values, fillKey, spot }: { values: BriefValues; fillKey: number; spot: BriefSpot | null }) {
  const launch = values.launchDate ? formatDate(values.launchDate, { long: true }) : "";
  return (
    <div className="overflow-hidden rounded-[10px] border border-rule bg-sheet">
      <div className="grid grid-cols-2 border-b border-rule sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Fact label="Market" className="col-span-2 border-b border-rule sm:col-span-1 sm:border-b-0 sm:border-r">
          {values.markets.map(marketName).join(" and ") || "None yet"}
        </Fact>
        <Fact label="Channel" className="border-r border-rule">
          {CHANNEL_LABELS[values.channel]}
        </Fact>
        {launch ? (
          <Line field="launchDate" label="Launch" text={launch} valueClass="text-[1.05rem] leading-snug text-ink" delay={0} fillKey={fillKey} spot={spot} />
        ) : (
          <Fact label="Launch">
            <span className="text-ink-3">Not set</span>
          </Fact>
        )}
      </div>
      <div className="divide-y divide-rule">
        {values.productName.trim() && (
          <Line field="productName" label="Product" text={values.productName} valueClass="text-[1.1rem] text-ink" delay={0} fillKey={fillKey} spot={spot} className="w-full" />
        )}
        {values.headline.trim() && (
          <Line
            field="headline"
            label="Headline"
            text={values.headline}
            valueClass="font-serif text-[1.75rem] leading-[1.15] text-ink sm:text-[2rem]"
            delay={110}
            fillKey={fillKey}
            spot={spot}
            className="w-full"
          />
        )}
        {values.bodyCopy.trim() && (
          <Line
            field="bodyCopy"
            label="Body text"
            text={values.bodyCopy}
            valueClass="max-w-[60ch] text-[1.02rem] leading-relaxed text-ink-2"
            delay={220}
            fillKey={fillKey}
            spot={spot}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}
