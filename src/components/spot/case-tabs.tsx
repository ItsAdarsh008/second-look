"use client";

import Image from "next/image";

export interface CaseTab {
  slug: string;
  /** The brand, never the case title, which would give the answer away. */
  name: string;
  thumb: string;
  outcome: "caught" | "shown" | null;
}

function Badge({ caught }: { caught: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-[var(--table)] ${caught ? "bg-[var(--table-pencil)] text-[var(--table)]" : "bg-[var(--table-ink)] text-[var(--table)]"}`}
    >
      {caught ? (
        <svg width="8" height="8" viewBox="0 0 14 14">
          <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="6" height="6" viewBox="0 0 12 12">
          <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

/** The example cases, as tabs in the light table's header. Each shows how it went once played. */
export function CaseTabs({ tabs, active, onPick }: { tabs: readonly CaseTab[]; active: string | null; onPick: (slug: string) => void }) {
  return (
    <div role="group" aria-label="Example cases" className="flex min-w-0 items-center gap-1.5">
      <span className="mr-1 hidden 2xl:inline">Examples</span>
      {tabs.map((t) => {
        const on = active === t.slug;
        const result = t.outcome === "caught" ? ", caught" : t.outcome === "shown" ? ", missed" : "";
        return (
          <button
            key={t.slug}
            type="button"
            onClick={() => onPick(t.slug)}
            aria-pressed={on}
            aria-label={`Example: ${t.name}${result}`}
            title={t.name}
            className={`flex min-w-0 items-center gap-2 rounded-[6px] border py-1 pl-1 pr-1 transition-colors xl:pr-2.5 ${
              on
                ? "border-[var(--table-ink)] bg-[var(--table-ink)] text-[var(--table)]"
                : "border-[var(--table-rule)] text-[var(--table-dim)] hover:border-[var(--table-dim)] hover:text-[var(--table-ink)]"
            }`}
          >
            <span className="relative block h-7 w-[1.4rem] shrink-0">
              <span className="absolute inset-0 overflow-hidden rounded-[2px]">
                <Image src={t.thumb} alt="" fill sizes="24px" className="object-cover" />
              </span>
              {t.outcome && <Badge caught={t.outcome === "caught"} />}
            </span>
            <span aria-hidden className="hidden max-w-[8.5rem] truncate text-[0.8rem] xl:inline">
              {t.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
