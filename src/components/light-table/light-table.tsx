"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { CreativeWithBoxes, type Box } from "../report/creative-boxes";
import { EASE_OUT } from "../motion/primitives";

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export type UploadState = { status: "idle" } | { status: "uploading" } | { status: "error"; message: string } | { status: "done" };

export type TableMode =
  | { kind: "idle" }
  | { kind: "scanning"; caption: string; ticker: readonly string[] }
  | { kind: "reviewed"; boxes: readonly Box[]; summary: string; critical: boolean };

/** Registration-style crop marks at the four corners of the sheet. */
function CropMarks({ spread }: { spread: boolean }) {
  const d = spread ? 14 : 0;
  const corners = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <motion.svg
          key={i}
          aria-hidden
          width="28"
          height="28"
          viewBox="0 0 28 28"
          className="pointer-events-none absolute"
          style={{
            left: c.x < 0 ? -32 : undefined,
            right: c.x > 0 ? -32 : undefined,
            top: c.y < 0 ? -32 : undefined,
            bottom: c.y > 0 ? -32 : undefined,
            scaleX: c.x,
            scaleY: c.y,
          }}
          animate={{ x: c.x * d, y: c.y * d }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <motion.path
            d="M28 18 H10 M18 28 V10"
            stroke="var(--table-dim)"
            strokeWidth="1.25"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.3 + i * 0.08 }}
          />
        </motion.svg>
      ))}
    </>
  );
}

function Ticker({ items }: { items: readonly string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 1400);
    return () => clearInterval(t);
  }, [items.length]);
  const current = items[i % Math.max(items.length, 1)];
  return (
    <span className="relative block h-5 overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        {current && (
          <motion.span
            key={current}
            className="absolute inset-0 truncate"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            {current}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function LightTable({
  imageUrl,
  mode,
  upload,
  onFile,
  onClear,
  placedKey,
  activeBoxId,
  onActivateBox,
}: {
  imageUrl: string | null;
  mode: TableMode;
  upload: UploadState;
  onFile: (file: File) => void;
  onClear: () => void;
  /** Changes whenever a new creative is placed, to replay the placement motion. */
  placedKey: string;
  activeBoxId?: string | null;
  onActivateBox?: (id: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const helpId = useId();
  const locked = mode.kind === "scanning";

  const accept = (file: File | undefined) => {
    if (!file || locked) return;
    if (!ACCEPT.includes(file.type)) return setLocalError("Use a PNG, JPEG or WebP image.");
    if (file.size > MAX_BYTES) return setLocalError("That image is over 10MB.");
    setLocalError(null);
    onFile(file);
  };

  useEffect(() => {
    if (!imageUrl) {
      setDims(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
  }, [imageUrl]);

  const error = localError ?? (upload.status === "error" ? upload.message : null);

  return (
    <section
      aria-label="Light table: the creative under review"
      className="light-table relative flex h-full min-h-[26rem] flex-col overflow-hidden rounded-[10px]"
      onDragOver={(e) => {
        e.preventDefault();
        if (!locked) setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        accept(e.dataTransfer.files[0]);
      }}
    >
      {/* Measuring grid, drawn as an SVG pattern. */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <pattern id="table-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="var(--table-grid)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#table-grid)" />
      </svg>

      <header className="relative flex items-center justify-between gap-4 border-b border-[var(--table-rule)] px-5 py-3 text-[0.82rem] text-[var(--table-dim)]">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${mode.kind === "scanning" ? "animate-pulse bg-[var(--table-pencil)]" : mode.kind === "reviewed" ? (mode.critical ? "bg-[#e0625c]" : "bg-[var(--table-pencil)]") : imageUrl ? "bg-[var(--table-ink)]" : "bg-[var(--table-rule)]"}`}
          />
          {mode.kind === "scanning" ? "Reading" : mode.kind === "reviewed" ? "Reviewed" : imageUrl ? "On the table" : "Empty"}
        </span>
        <span className="tabular-nums">{dims ? `${dims.w} × ${dims.h} px` : "PNG, JPEG or WebP, up to 10MB"}</span>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-12 py-12 sm:px-16">
        {/* initial={false}: the first render is server-painted immediately; later placements animate. */}
        <AnimatePresence mode="wait" initial={false}>
          {imageUrl ? (
            <motion.div
              key={placedKey}
              className="relative w-full max-w-[26rem]"
              initial={{ opacity: 0, scale: 1.06, rotate: -1.2, y: -18 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            >
              <CropMarks spread={dragging} />
              <div className="relative shadow-[0_0_0_1px_var(--table-rule)]">
                <CreativeWithBoxes
                  src={imageUrl}
                  alt="The creative under review"
                  boxes={mode.kind === "reviewed" ? mode.boxes : []}
                  activeId={activeBoxId}
                  onActivate={onActivateBox}
                  sizes="(min-width: 1024px) 420px, 90vw"
                  loupe={mode.kind !== "scanning"}
                  dark
                  priority
                  drawDelay={0.2}
                />
                {mode.kind === "scanning" && (
                  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-[var(--table)]/25" />
                    <div className="scan-line absolute inset-x-0 top-0 h-full">
                      <div className="absolute inset-x-0 top-0 h-16 -translate-y-full bg-[var(--table-pencil)]/15" />
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-[var(--table-pencil)]" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="relative w-full max-w-[22rem]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CropMarks spread={dragging} />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-describedby={helpId}
                className={`flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 border border-dashed px-8 text-center transition-colors ${dragging ? "border-[var(--table-pencil)] bg-[var(--table-pencil)]/10" : "border-[var(--table-rule)] hover:border-[var(--table-dim)]"}`}
              >
                <motion.span
                  className="font-serif text-[2rem] leading-tight text-[var(--table-ink)]"
                  animate={{ scale: dragging ? 1.05 : 1 }}
                >
                  {dragging ? "Let go to place it" : "Drop the ad here"}
                </motion.span>
                <span id={helpId} className="text-sm text-[var(--table-dim)]">
                  or click to choose a file, or try a case on the left
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="relative flex min-h-12 items-center justify-between gap-4 border-t border-[var(--table-rule)] px-5 py-3 text-[0.88rem]" aria-live="polite">
        {mode.kind === "scanning" ? (
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 text-[var(--table-pencil)]">{mode.caption}</span>
            <span className="min-w-0 flex-1 text-[var(--table-dim)]">
              <Ticker items={mode.ticker} />
            </span>
          </span>
        ) : mode.kind === "reviewed" ? (
          <span className={mode.critical ? "text-[#f0a39d]" : "text-[var(--table-ink)]"}>{mode.summary}</span>
        ) : upload.status === "uploading" ? (
          <span className="text-[var(--table-dim)]">Uploading…</span>
        ) : error ? (
          <span role="alert" className="text-[#f0a39d]">
            {error}
          </span>
        ) : imageUrl ? (
          <span className="text-[var(--table-dim)]">Hover to inspect with the loupe.</span>
        ) : (
          <span className="text-[var(--table-dim)]">Nothing on the table yet.</span>
        )}
        {imageUrl && !locked && (
          <span className="flex shrink-0 gap-4 text-[0.85rem]">
            <button type="button" className="text-[var(--table-pencil)] underline underline-offset-2" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="text-[var(--table-dim)] underline underline-offset-2 hover:text-[var(--table-ink)]" onClick={onClear}>
              Remove
            </button>
          </span>
        )}
      </footer>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose creative image"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </section>
  );
}
