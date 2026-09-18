"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CHANNELS, CHANNEL_LABELS, type Channel, type Market } from "@/lib/schema";
import { useTypewriter } from "../motion/primitives";
import { useScrollTo } from "../motion/providers";
import { MarketPicker } from "./market-picker";

export interface BriefValues {
  brandName: string;
  productName: string;
  headline: string;
  bodyCopy: string;
  markets: Market[];
  launchDate: string;
  channel: Channel;
  brandNotes: string;
}

export const EMPTY_BRIEF: BriefValues = {
  brandName: "",
  productName: "",
  headline: "",
  bodyCopy: "",
  markets: [],
  launchDate: "",
  channel: "social",
  brandNotes: "",
};

export type FieldErrors = Partial<Record<keyof BriefValues | "image", string>>;

const lineInput =
  "w-full border-0 border-b bg-transparent px-0 pb-1.5 pt-1 text-[1.02rem] text-ink placeholder:text-ink-3/70 outline-none transition-colors focus:border-pencil focus-visible:outline-none";

function TextField({
  label,
  value,
  onChange,
  fillKey,
  delay,
  error,
  hint,
  multiline,
  serif,
  maxLength,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fillKey: number;
  delay: number;
  error?: string;
  hint?: string;
  multiline?: boolean;
  serif?: boolean;
  maxLength: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const { text, typing } = useTypewriter(value, fillKey, delay);
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const className = `${lineInput} ${error ? "border-critical" : "border-rule-strong"} ${serif ? "font-serif text-[1.45rem] leading-snug" : ""}`;
  const common = {
    id,
    value: text,
    readOnly: typing,
    disabled,
    maxLength,
    placeholder,
    "aria-invalid": Boolean(error),
    "aria-describedby": described,
  };

  return (
    <div>
      <label htmlFor={id} className="block text-[0.82rem] text-ink-3">
        {label}
      </label>
      {multiline ? (
        <textarea {...common} rows={1} className={`${className} max-h-40 resize-none field-sizing-content`} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} className={className} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-[0.8rem] text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[0.85rem] text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton({ form, disabled, submitting, className = "" }: { form: string; disabled: boolean; submitting: boolean; className?: string }) {
  return (
    <motion.button
      type="submit"
      form={form}
      whileTap={{ scale: 0.97 }}
      disabled={disabled}
      className={`group relative overflow-hidden rounded-[6px] bg-ink px-6 py-3.5 text-[1rem] font-medium text-paper disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span className="absolute inset-0 origin-left scale-x-0 bg-pencil transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-enabled:group-hover:scale-x-100" aria-hidden />
      <span className="relative">{submitting ? "Reading the campaign…" : "Run a second look"}</span>
    </motion.button>
  );
}

export function BriefForm({
  values,
  onChange,
  errors,
  onSubmit,
  submitting,
  uploading,
  fillKey,
  analysisAvailable,
  lead,
  collapsible = false,
  pinnable = true,
}: {
  values: BriefValues;
  onChange: (patch: Partial<BriefValues>) => void;
  errors: FieldErrors;
  onSubmit: () => void;
  submitting: boolean;
  uploading: boolean;
  fillKey: number;
  analysisAvailable: boolean;
  /** Shown above the fields: a loaded case's own brief. */
  lead?: React.ReactNode;
  /** Tuck the fields behind "Edit", for a case whose brief is already complete. */
  collapsible?: boolean;
  /** Whether the submit button may pin to the bottom of small screens. */
  pinnable?: boolean;
}) {
  const ids = useId();
  const formId = `${ids}-form`;
  const formRef = useRef<HTMLFormElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const attempted = useRef(false);
  const scrollTo = useScrollTo();
  const disabled = submitting || uploading || !analysisAvailable;
  const [editing, setEditing] = useState(false);
  // Clip the fields only while they open or close: the market picker's list hangs below them.
  const [clip, setClip] = useState(false);
  const fieldError = Boolean(errors.markets || errors.launchDate || errors.channel || errors.brandNotes);
  const showFields = !collapsible || editing || fieldError;
  const fieldsId = `${ids}-fields`;

  // Below lg the light table sits above the brief, so the submit button starts off screen.
  // Pin a copy to the bottom of the viewport until the real one scrolls into view. Null until measured.
  const [pinned, setPinned] = useState<boolean | null>(null);
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    // Two observers because a jump (scroll restoration, the End key) can carry the button from below the fold
    // to above it without ever intersecting the viewport, which a single observer never reports.
    let onScreen = false;
    let onScreenOrBelow = false;
    const update = () => setPinned(onScreenOrBelow && !onScreen);
    const screen = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      onScreen = entry.isIntersecting;
      update();
    });
    const belowFold = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        onScreenOrBelow = entry.isIntersecting;
        update();
      },
      { rootMargin: "0px 0px 100000px 0px" },
    );
    screen.observe(el);
    belowFold.observe(el);
    return () => {
      screen.disconnect();
      belowFold.disconnect();
    };
  }, []);

  // A submit from the pinned bar can fail validation with the fields off screen: bring them into view.
  useEffect(() => {
    if (!attempted.current) return;
    attempted.current = false;
    if (pinned && Object.values(errors).some(Boolean)) scrollTo(formRef.current, -24);
  }, [errors, pinned, scrollTo]);

  const attempt = () => {
    attempted.current = true;
    onSubmit();
  };

  return (
    <form
      ref={formRef}
      id={formId}
      noValidate
      aria-label="Campaign brief"
      onSubmit={(e) => {
        e.preventDefault();
        attempt();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          attempt();
        }
      }}
      className="space-y-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[0.82rem] text-ink-3">The brief</h2>
        {collapsible && !fieldError && (
          <button
            type="button"
            aria-expanded={showFields}
            aria-controls={fieldsId}
            onClick={() => {
              setClip(true);
              setEditing((v) => !v);
            }}
            className="text-[0.82rem] text-ink-3 underline decoration-rule-strong underline-offset-4 hover:text-ink"
          >
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {lead}

      <AnimatePresence initial={false}>
        {showFields && (
          <motion.div
            id={fieldsId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={() => setClip(false)}
            style={{ overflow: clip ? "hidden" : "visible" }}
            className="space-y-4"
          >
            {/* A sheet of fields, like a case's brief. Not overflow-hidden: the market list hangs below it. */}
            <div className="rounded-[10px] border border-rule bg-sheet">
              <div className="border-b border-rule px-4 py-4 sm:px-5">
                <MarketPicker value={values.markets} onChange={(markets) => onChange({ markets })} error={errors.markets} disabled={submitting} />
              </div>
              <div className="grid border-b border-rule sm:grid-cols-2">
                <div className="border-b border-rule px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
                  <label htmlFor={`${ids}-date`} className="block text-[0.82rem] text-ink-3">
                    Launch date
                  </label>
                  <input
                    id={`${ids}-date`}
                    type="date"
                    value={values.launchDate}
                    onChange={(e) => onChange({ launchDate: e.target.value })}
                    className={`${lineInput} min-h-11 border-rule-strong`}
                  />
                </div>
                <div className="px-4 py-4 sm:px-5">
                  <label htmlFor={`${ids}-channel`} className="block text-[0.82rem] text-ink-3">
                    Channel
                  </label>
                  <select
                    id={`${ids}-channel`}
                    value={values.channel}
                    onChange={(e) => onChange({ channel: e.target.value as Channel })}
                    className={`${lineInput} min-h-11 cursor-pointer border-rule-strong`}
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {CHANNEL_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-5">
                <TextField
                  label="Brand notes (optional)"
                  value={values.brandNotes}
                  onChange={(v) => onChange({ brandNotes: v })}
                  fillKey={fillKey}
                  delay={240}
                  maxLength={1000}
                  multiline
                  error={errors.brandNotes}
                  placeholder="Anything the image doesn't show"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* On lg the actions stick to the bottom of the viewport, so a loaded case's copy can't push the button below the fold. */}
      <div ref={actionsRef} className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1 lg:sticky lg:bottom-0 lg:z-10 lg:border-t lg:border-rule lg:bg-paper lg:py-3">
        {errors.image && (
          <p className="basis-full text-[0.9rem] text-critical" role="alert">
            {errors.image}
          </p>
        )}
        <SubmitButton form={formId} disabled={disabled} submitting={submitting} />
        <p className="text-[0.85rem] text-ink-3">{analysisAvailable ? "Takes about a minute." : "Live analysis is off on this deployment."}</p>
      </div>

      {pinned !== null &&
        analysisAvailable &&
        pinnable &&
        createPortal(
          <div
            inert={!pinned}
            className={`fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-8 lg:hidden ${
              pinned ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <SubmitButton form={formId} disabled={disabled} submitting={submitting} className="w-full" />
          </div>,
          document.body,
        )}
    </form>
  );
}
