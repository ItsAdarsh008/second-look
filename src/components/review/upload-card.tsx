"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { CREATIVE_TYPES, creativeFileError } from "@/lib/upload-rules";
import type { UploadState } from "../light-table/light-table";
import { EASE_OUT } from "../motion/primitives";

export function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M8 10.5V2.5M4.75 5.75L8 2.5l3.25 3.25M2.5 10v3.5h11V10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The way in for someone's own campaign: the page's main call to action, above the
 * example cases. Choose a file or drag one onto the card; once it's on the table the
 * card says so and offers to replace it.
 */
export function UploadCard({ onFile, own }: { onFile: (file: File) => void; own: { previewUrl: string; upload: UploadState } | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hintId = useId();

  const take = (file: File | undefined) => {
    if (!file) return;
    const problem = creativeFileError(file);
    setError(problem);
    if (!problem) onFile(file);
  };
  const shownError = error ?? (own?.upload.status === "error" ? own.upload.message : null);
  const choose = () => input.current?.click();

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(e.dataTransfer.files[0]);
      }}
      className={`rounded-[10px] border p-5 transition-colors duration-200 ${
        dragging ? "border-pencil bg-pencil-wash" : own ? "border-rule bg-sheet" : "border-dashed border-rule-strong bg-sheet"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {own ? (
          <motion.div key="own" className="flex items-center gap-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: EASE_OUT }}>
            <span className="relative h-16 w-[3.2rem] shrink-0 overflow-hidden rounded-[4px] border border-rule">
              <Image src={own.previewUrl} alt="" fill sizes="52px" unoptimized={own.previewUrl.startsWith("blob:")} className="object-cover" />
            </span>
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="font-serif text-[1.35rem] leading-tight text-ink">Your ad is on the table</p>
              <p className={`mt-0.5 text-[0.88rem] ${shownError ? "text-critical" : "text-ink-3"}`}>
                {own.upload.status === "uploading" ? "Uploading…" : (shownError ?? "Say where and when it runs, then run a second look.")}
              </p>
            </div>
            <button
              type="button"
              onClick={choose}
              className="inline-flex shrink-0 items-center gap-2 rounded-[6px] border border-rule-strong px-3.5 py-2 text-[0.9rem] text-ink transition-colors hover:border-ink"
            >
              <UploadIcon size={14} />
              Replace
            </button>
          </motion.div>
        ) : (
          <motion.div key="ask" className="flex gap-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: EASE_OUT }}>
            <span aria-hidden className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${dragging ? "bg-pencil text-paper" : "bg-ink text-paper"}`}>
              <UploadIcon size={18} />
            </span>
            <div className="min-w-0">
              <p className="font-serif text-[1.6rem] leading-tight text-ink">{dragging ? "Let go to put it on the table" : "Review your own ad"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  onClick={choose}
                  aria-describedby={hintId}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-[6px] bg-ink px-5 py-3 text-[0.98rem] font-medium text-paper"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-pencil transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" aria-hidden />
                  <span className="relative">
                    <UploadIcon />
                  </span>
                  <span className="relative">Choose an image</span>
                </button>
                <span id={hintId} className="text-[0.82rem] text-ink-3">
                  <span className="hidden sm:inline">or drag it here. </span>PNG, JPEG or WebP, up to 10MB.
                </span>
              </div>
              {shownError && (
                <p role="alert" className="mt-2 text-[0.88rem] text-critical">
                  {shownError}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <input
        ref={input}
        type="file"
        accept={CREATIVE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose your ad"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
