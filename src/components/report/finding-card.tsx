"use client";

import { useId, useState } from "react";
import { percent } from "@/lib/format";
import { CATEGORY_LABEL, DISPUTE_NOTE, PRECEDENT_KIND_LABEL, SEVERITY_LABEL } from "@/lib/report";
import type { CalendarHit, CampaignInput, Finding, Precedent, Severity } from "@/lib/schema";
import { ConceptLocus, CopyLocus, ImageLocus, TimingLocus } from "./loci";

export function SeverityTag({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    critical: "bg-critical text-critical-ink border-critical",
    high: "border-high text-high",
    moderate: "border-moderate-rule text-moderate",
    low: "border-low-rule text-low",
  };
  return (
    <span className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[0.8rem] font-semibold ${styles[severity]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function PrecedentItem({ p }: { p: Precedent }) {
  const heading = p.brand ? `${p.brand}, ${p.title}` : p.title;
  return (
    <li className="rounded-[4px] border border-rule bg-sheet px-3.5 py-3">
      <p className="text-[0.8rem] text-ink-3">{PRECEDENT_KIND_LABEL[p.kind]}</p>
      <p className="mt-0.5 font-medium leading-snug text-ink">
        {heading}
        {p.year !== null && <span className="font-normal text-ink-2"> ({p.year})</span>}
      </p>
      <p className="text-sm text-ink-3">{p.market}</p>
      <p className="mt-1.5 text-[0.93rem] text-ink-2">{p.summary}</p>
      {p.outcome && <p className="mt-1 text-[0.93rem] text-ink-2">Outcome: {p.outcome}</p>}
      {p.sourceUrl && (
        <p className="mt-1.5 text-sm">
          <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="text-pencil underline underline-offset-2">
            Source: {hostname(p.sourceUrl)}
          </a>
        </p>
      )}
    </li>
  );
}

export function FindingCard({
  finding,
  index,
  input,
  calendarHits,
  active,
  onActivate,
}: {
  finding: Finding;
  index: number;
  input: CampaignInput;
  calendarHits: readonly CalendarHit[];
  active: boolean;
  onActivate: (id: string | null) => void;
}) {
  const [disputeOpen, setDisputeOpen] = useState(false);
  const disputeId = useId();
  const headingId = useId();
  const label = String(index + 1);
  const { locus } = finding;

  return (
    <article
      aria-labelledby={headingId}
      tabIndex={0}
      onMouseEnter={() => onActivate(finding.id)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(finding.id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onActivate(null);
      }}
      className={`scroll-mt-6 rounded-[6px] border bg-paper p-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pencil sm:p-6 ${
        finding.severity === "critical" ? "border-critical border-t-[6px]" : active ? "border-rule-strong" : "border-rule"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-2">
        <span className="font-semibold text-ink" aria-label={`Finding ${label}`}>
          {label}
        </span>
        <SeverityTag severity={finding.severity} />
        <span>{CATEGORY_LABEL[finding.category]}</span>
        <span className="text-ink-3">{finding.markets.join(", ")}</span>
        <span className="ml-auto text-ink-3">{percent(finding.confidence)} confidence</span>
      </div>

      <h3 id={headingId} className="mt-3 font-serif text-[1.6rem] leading-[1.18] sm:text-[1.85rem]">
        {finding.claim}
      </h3>

      <div className="mt-5">
        {locus.kind === "timing" && <TimingLocus locus={locus} input={input} hits={calendarHits} />}
        {locus.kind === "copy" && <CopyLocus locus={locus} input={input} />}
        {locus.kind === "image" && <ImageLocus locus={locus} input={input} label={label} active={active} />}
        {locus.kind === "concept" && <ConceptLocus locus={locus} />}
      </div>

      <p className="mt-5 max-w-[68ch] text-[1.02rem] leading-relaxed text-ink">{finding.rationale}</p>

      <div className="mt-5">
        <h4 className="text-sm font-medium text-ink-2">Grounding</h4>
        <ul className="mt-2 grid gap-2 md:grid-cols-2">
          {finding.precedents.map((p, i) => (
            <PrecedentItem key={`${p.title}-${i}`} p={p} />
          ))}
        </ul>
      </div>

      <div className="mt-5 border-t border-rule pt-4">
        <h4 className="text-sm font-medium text-ink-2">Proposed change</h4>
        <p className="mt-1 text-[1.02rem] text-ink">{finding.fixDirective}</p>
      </div>

      <div className="mt-4">
        <button
          type="button"
          aria-expanded={disputeOpen}
          aria-controls={disputeId}
          onClick={() => setDisputeOpen((o) => !o)}
          className="text-sm text-ink-3 underline underline-offset-2 hover:text-ink"
        >
          {disputeOpen ? "Hide note" : "Dispute this finding"}
        </button>
        <p id={disputeId} hidden={!disputeOpen} className="mt-2 max-w-[68ch] border-l-2 border-pencil pl-3 text-[0.95rem] text-ink-2">
          {DISPUTE_NOTE}
        </p>
      </div>
    </article>
  );
}
