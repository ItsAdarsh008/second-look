"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { MARKETS, marketName, type Market } from "@/lib/schema";

/**
 * Markets as ISO code tags rather than flags: flag emoji are excluded by the design
 * spec and render inconsistently, and a cultural-review tool shouldn't hand-draw
 * national flags. Compact popover so the whole brief fits beside the light table.
 */
export function MarketPicker({
  value,
  onChange,
  max = 6,
  error,
  disabled,
}: {
  value: Market[];
  onChange: (next: Market[]) => void;
  max?: number;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const ids = useId();

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const toggle = (code: Market) => {
    if (value.includes(code)) onChange(value.filter((m) => m !== code));
    else if (value.length < max) onChange([...value, code]);
  };

  const q = query.trim().toLowerCase();
  const filtered = MARKETS.filter((m) => !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().startsWith(q));

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <span id={`${ids}-label`} className="block text-[0.82rem] text-ink-3">
        Markets
      </span>
      <div className={`mt-1 flex min-h-11 flex-wrap items-center gap-1.5 border-b pb-1.5 ${error ? "border-critical" : "border-rule-strong"} focus-within:border-pencil`}>
        <AnimatePresence initial={false}>
          {value.map((code) => (
            <motion.span
              key={code}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1 rounded-[4px] bg-ink py-0.5 pl-2 pr-1 text-[0.85rem] text-paper"
            >
              <span className="font-semibold">{code}</span>
              <span className="hidden sm:inline">{marketName(code)}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(code)}
                aria-label={`Remove ${marketName(code)}`}
                className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-[3px] text-paper/70 hover:bg-paper/15 hover:text-paper"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                  <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <button
          type="button"
          disabled={disabled || value.length >= max}
          aria-expanded={open}
          aria-controls={`${ids}-panel`}
          aria-describedby={`${ids}-label`}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-[4px] border border-dashed border-rule-strong px-2 py-0.5 text-[0.85rem] text-ink-2 hover:border-ink hover:text-ink disabled:opacity-40"
        >
          {value.length === 0 ? "Add markets" : "Add"}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-critical">{error}</p>}

      <AnimatePresence>
        {open && (
          <motion.div
            id={`${ids}-panel`}
            role="group"
            aria-label="Choose markets"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2.5rem))] rounded-[8px] border border-rule bg-sheet shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)]"
          >
            <div className="border-b border-rule p-2">
              <input
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markets"
                aria-label="Search markets"
                className="w-full rounded-[4px] bg-paper px-2.5 py-1.5 text-[0.92rem] outline-none focus-visible:outline-2 focus-visible:outline-pencil"
              />
            </div>
            <ul className="max-h-64 overflow-auto p-1">
              {filtered.map((m) => {
                const selected = value.includes(m.code);
                const full = !selected && value.length >= max;
                return (
                  <li key={m.code}>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-[4px] px-2.5 py-1.5 text-[0.92rem] hover:bg-paper ${full ? "cursor-not-allowed opacity-40" : ""}`}>
                      <input type="checkbox" checked={selected} disabled={full} onChange={() => toggle(m.code)} className="accent-[var(--ink)]" />
                      <span className="w-7 text-[0.78rem] font-semibold text-ink-3">{m.code}</span>
                      <span>{m.name}</span>
                    </label>
                  </li>
                );
              })}
              {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-ink-3">No supported market matches. Second Look covers these 15.</li>}
            </ul>
            <div className="flex items-center justify-between border-t border-rule px-3 py-2 text-[0.8rem] text-ink-3">
              <span>
                {value.length} of {max} chosen
              </span>
              <button type="button" onClick={() => setOpen(false)} className="text-pencil underline underline-offset-2">
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
