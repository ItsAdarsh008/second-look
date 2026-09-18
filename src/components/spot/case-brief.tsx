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

const ROWS: readonly { field: SpotField; label: string; className: string }[] = [
  { field: "launchDate", label: "Launch", className: "text-ink" },
  { field: "productName", label: "Product", className: "text-ink" },
  { field: "headline", label: "Headline", className: "font-serif text-[1.3rem] leading-snug text-ink" },
  { field: "bodyCopy", label: "Body copy", className: "text-[0.95rem] leading-relaxed text-ink-2" },
];

function valueOf(values: BriefValues, field: SpotField): string {
  if (field === "launchDate") return values.launchDate ? formatDate(values.launchDate, { long: true }) : "";
  return values[field].trim();
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

const rowGrid = "grid w-full grid-cols-[5.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-[5px] px-2.5 py-2 text-left";

function Row({ label, text, className, delay, fillKey, spot, field }: { label: string; text: string; className: string; delay: number; fillKey: number; spot: BriefSpot | null; field: SpotField }) {
  const typed = useTypewriter(text, fillKey, delay);
  const outcome = spot?.progress.outcome ?? null;
  const answer = outcome ? spot?.key.lines.find((l) => l.field === field) : undefined;
  const missed = spot?.progress.misses.some((g) => g.kind === "line" && g.field === field) ?? false;
  const caughtHere = outcome?.kind === "caught" && outcome.guess.kind === "line" && outcome.guess.field === field;
  const flaggable = spot !== null && outcome === null && !missed;

  const value = answer ? <Marked text={text} excerpt={answer.excerpt} /> : typed.text;
  const cells = (status: React.ReactNode) => (
    <>
      <span className="text-[0.8rem] text-ink-3">{label}</span>
      <span className={`${className} ${missed && !answer ? "line-through decoration-ink-3/60" : ""}`}>
        <span aria-hidden>{value}</span>
        <span className="sr-only">{text}</span>
      </span>
      {status}
    </>
  );

  if (flaggable) {
    return (
      <li>
        <button type="button" onClick={() => spot.onGuess({ kind: "line", field })} aria-label={`Flag the ${label.toLowerCase()}: ${text}`} className={`group ${rowGrid} transition-colors hover:bg-pencil-wash focus-visible:bg-pencil-wash`}>
          {cells(<span className="text-[0.78rem] font-medium text-pencil opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Flag</span>)}
        </button>
      </li>
    );
  }
  return (
    <li className={rowGrid}>
      {cells(
        caughtHere ? (
          <span className="text-[0.78rem] font-medium text-pencil">Caught</span>
        ) : missed ? (
          <span className="text-[0.78rem] text-ink-3">Not this one</span>
        ) : null,
      )}
    </li>
  );
}

/**
 * A case's brief, read-only: where it runs, then the lines a reviewer reads. While the
 * case is in play, each line can be flagged, and the answer is marked once it's settled.
 */
export function CaseBrief({ values, fillKey, spot }: { values: BriefValues; fillKey: number; spot: BriefSpot | null }) {
  const runsIn = `${values.markets.map(marketName).join(" and ") || "No markets yet"}, ${CHANNEL_LABELS[values.channel].toLowerCase()}`;
  const rows = ROWS.map((r) => ({ ...r, text: valueOf(values, r.field) })).filter((r) => r.text);
  return (
    <ul className="-mx-2.5">
      <li className={rowGrid}>
        <span className="text-[0.8rem] text-ink-3">Runs in</span>
        <span className="text-ink">{runsIn}</span>
      </li>
      {rows.map((r, i) => (
        <Row key={r.field} {...r} delay={i * 110} fillKey={fillKey} spot={spot} />
      ))}
    </ul>
  );
}
