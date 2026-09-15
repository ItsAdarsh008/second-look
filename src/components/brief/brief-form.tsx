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
        <textarea {...common} rows={1} className={`${className} max-h-40 resize-none field-sizing-content`} onChange={(e) => onChange(e.target.value)} data-lenis-prevent />
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

function TypedLine({ text, fillKey, delay, className }: { text: string; fillKey: number; delay: number; className?: string }) {
  const typed = useTypewriter(text, fillKey, delay);
  return (
    <span className={className}>
      <span aria-hidden>{typed.text}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** A case's own copy, shown read-only: it travels with the case so the analyzer sees what the real campaign said. */
function CaseCopy({ values, fillKey }: { values: BriefValues; fillKey: number }) {
  const rows = [
    { label: "Product", text: values.productName, delay: 0, className: "text-ink" },
    { label: "Headline", text: values.headline, delay: 120, className: "font-serif text-[1.35rem] leading-snug text-ink" },
    { label: "Body copy", text: values.bodyCopy, delay: 260, className: "text-[0.95rem] text-ink-2" },
  ].filter((r) => r.text.trim());

  return (
    <div className="rounded-[8px] border border-rule bg-sheet px-4 py-3.5">
      <p className="text-[0.82rem] text-ink-3">Copy from this case{values.brandName ? `, ${values.brandName}` : ""}</p>
      <dl className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-3">
            <dt className="text-[0.8rem] text-ink-3">{r.label}</dt>
            <dd>
              <TypedLine text={r.text} fillKey={fillKey} delay={r.delay} className={r.className} />
            </dd>
          </div>
        ))}
      </dl>
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
}: {
  values: BriefValues;
  onChange: (patch: Partial<BriefValues>) => void;
  errors: FieldErrors;
  onSubmit: () => void;
  submitting: boolean;
  uploading: boolean;
  fillKey: number;
  analysisAvailable: boolean;
}) {
  const ids = useId();
  const formId = `${ids}-form`;
  const formRef = useRef<HTMLFormElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const attempted = useRef(false);
  const scrollTo = useScrollTo();
  // Cases ship with their own copy; a user's upload has none and the copy is read from the creative.
  const caseCopy = [values.productName, values.headline, values.bodyCopy].some((v) => v.trim().length > 0);
  const disabled = submitting || uploading || !analysisAvailable;

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
      <AnimatePresence initial={false}>
        {caseCopy && (
          <motion.div
            key={fillKey}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <CaseCopy values={values} fillKey={fillKey} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        <MarketPicker value={values.markets} onChange={(markets) => onChange({ markets })} error={errors.markets} disabled={submitting} />
        <div>
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
        <div>
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

      <TextField
        label="Brand notes (optional)"
        value={values.brandNotes}
        onChange={(v) => onChange({ brandNotes: v })}
        fillKey={fillKey}
        delay={240}
        maxLength={1000}
        multiline
        error={errors.brandNotes}
        placeholder="Caption, campaign name, what an alternative must keep"
        hint="Second Look reads the copy from the creative. Add anything the image doesn't show."
      />

      {/* On lg the actions stick to the bottom of the viewport, so a loaded case's copy can't push the button below the fold. */}
      <div ref={actionsRef} className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1 lg:sticky lg:bottom-0 lg:z-10 lg:border-t lg:border-rule lg:bg-paper lg:py-3">
        {errors.image && (
          <p className="basis-full text-[0.9rem] text-critical" role="alert">
            {errors.image}
          </p>
        )}
        <SubmitButton form={formId} disabled={disabled} submitting={submitting} />
        <p className="max-w-[40ch] text-[0.85rem] text-ink-3">
          {analysisAvailable ? (
            <>
              About a minute. <kbd className="rounded-[3px] border border-rule px-1 font-sans text-[0.78rem]">Ctrl</kbd> +{" "}
              <kbd className="rounded-[3px] border border-rule px-1 font-sans text-[0.78rem]">Enter</kbd> works too.
            </>
          ) : (
            "Live analysis isn't configured on this deployment. Browse the case studies instead."
          )}
        </p>
      </div>

      {pinned !== null &&
        analysisAvailable &&
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
