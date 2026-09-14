"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { CHANNELS, CHANNEL_LABELS, type Channel, type Market } from "@/lib/schema";
import { useTypewriter } from "../motion/primitives";
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
        <textarea {...common} rows={2} className={`${className} resize-none`} onChange={(e) => onChange(e.target.value)} data-lenis-prevent />
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
  const [notesOpen, setNotesOpen] = useState(false);
  const ids = useId();
  const showNotes = notesOpen || values.brandNotes.length > 0;

  return (
    <form
      noValidate
      aria-label="Campaign brief"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSubmit();
        }
      }}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <TextField label="Product name" value={values.productName} onChange={(v) => onChange({ productName: v })} fillKey={fillKey} delay={0} error={errors.productName} maxLength={120} placeholder="What's it called?" />
        <TextField label="Brand" value={values.brandName} onChange={(v) => onChange({ brandName: v })} fillKey={fillKey} delay={80} maxLength={80} placeholder="Optional" />
      </div>

      <TextField label="Headline" value={values.headline} onChange={(v) => onChange({ headline: v })} fillKey={fillKey} delay={160} error={errors.headline} maxLength={300} serif placeholder="The line people will read" />

      <TextField label="Body copy" value={values.bodyCopy} onChange={(v) => onChange({ bodyCopy: v })} fillKey={fillKey} delay={320} error={errors.bodyCopy} maxLength={2000} multiline placeholder="In the language it will run in" />

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

      <div>
        {!showNotes ? (
          <button type="button" onClick={() => setNotesOpen(true)} className="text-[0.88rem] text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink">
            Add brand notes
          </button>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <TextField
                label="Brand notes"
                value={values.brandNotes}
                onChange={(v) => onChange({ brandNotes: v })}
                fillKey={fillKey}
                delay={480}
                maxLength={1000}
                multiline
                hint="What any alternative must keep: logo placement, palette, product."
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {errors.image && (
        <p className="text-[0.9rem] text-critical" role="alert">
          {errors.image}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          disabled={submitting || uploading || !analysisAvailable}
          className="group relative overflow-hidden rounded-[6px] bg-ink px-6 py-3.5 text-[1rem] font-medium text-paper disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="absolute inset-0 origin-left scale-x-0 bg-pencil transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-enabled:group-hover:scale-x-100" aria-hidden />
          <span className="relative">{submitting ? "Reading the campaign…" : "Run a second look"}</span>
        </motion.button>
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
    </form>
  );
}
