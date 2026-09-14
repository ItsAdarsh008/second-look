"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ApiRequestError, analyzeWithProgress, uploadLocal, uploadToBlob } from "@/lib/clients/secondlook";
import { formatDate } from "@/lib/format";
import { severityCounts, verdictLine } from "@/lib/report";
import type { ExampleCase } from "@/lib/examples";
import { CHANNEL_LABELS, CampaignInputSchema, marketName, type AnalysisResult, type CampaignInput } from "@/lib/schema";
import { BriefForm, EMPTY_BRIEF, type BriefValues, type FieldErrors } from "../brief/brief-form";
import { GeneratePanel } from "../generate/generate-panel";
import { LightTable, type TableMode, type UploadState } from "../light-table/light-table";
import { EASE_OUT, RiseLines } from "../motion/primitives";
import { useScrollTo } from "../motion/providers";
import { Report, type IncidentSummary } from "../report/report";
import { AnalysisProgress, INITIAL_PROGRESS, progressCaption, reduceProgress, type ProgressState } from "./analysis-progress";

type Phase =
  | { kind: "brief" }
  | { kind: "analyzing"; progress: ProgressState }
  | { kind: "report"; result: AnalysisResult }
  | { kind: "failed"; code: string; message: string };

const FAILURE_HELP: Record<string, string> = {
  rate_limited: "Rate limit reached",
  not_ad_creative: "That doesn't look like an ad",
  off_purpose: "That doesn't look like a campaign",
  empty_campaign: "Add some copy",
  image_unavailable: "The creative couldn't be read",
  refused: "The model declined this one",
  not_configured: "Analysis isn't configured",
};

function toInput(values: BriefValues, imageUrl: string | null): { input: CampaignInput | null; errors: FieldErrors } {
  const errors: FieldErrors = {};
  if (!imageUrl) errors.image = "Put the creative on the light table. Even when the risk is in the words, the picture changes how they read.";
  if (!values.productName.trim() && !values.headline.trim() && !values.bodyCopy.trim()) {
    errors.productName = "Add at least a product name, headline or body copy.";
  }
  if (values.markets.length === 0) errors.markets = "Pick at least one market.";
  if (!imageUrl || Object.keys(errors).length > 0) return { input: null, errors };

  const parsed = CampaignInputSchema.safeParse({
    imageUrl,
    imageFilePath: null,
    brandName: values.brandName.trim() || undefined,
    headline: values.headline,
    bodyCopy: values.bodyCopy,
    productName: values.productName,
    markets: values.markets,
    launchDate: values.launchDate || undefined,
    channel: values.channel,
    brandNotes: values.brandNotes.trim() || undefined,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      const key: keyof FieldErrors = typeof field === "string" && field in EMPTY_BRIEF ? (field as keyof BriefValues) : "image";
      errors[key] ??= issue.message;
    }
    return { input: null, errors };
  }
  return { input: parsed.data, errors };
}

function ExampleChips({ examples, onLoad, activeSlug, disabled }: { examples: readonly ExampleCase[]; onLoad: (slug: string) => void; activeSlug: string | null; disabled: boolean }) {
  return (
    <div>
      <p className="text-[0.82rem] text-ink-3">Or start from a case</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {examples.map((c, i) => (
          <li key={c.slug} className="fade-up" style={{ animationDelay: `${320 + i * 35}ms` }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onLoad(c.slug)}
              aria-pressed={activeSlug === c.slug}
              className={`group flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[0.85rem] transition-colors disabled:opacity-50 ${
                activeSlug === c.slug ? "border-ink bg-ink text-paper" : "border-rule bg-sheet text-ink-2 hover:border-ink hover:text-ink"
              }`}
            >
              <span className="relative h-6 w-6 overflow-hidden rounded-full">
                <Image src={`/cases/${c.slug}-thumb.png`} alt="" fill sizes="24px" className="object-cover transition-transform duration-300 group-hover:scale-125" />
              </span>
              {c.title}
              {c.kind === "control" && <span className={activeSlug === c.slug ? "text-paper/70" : "text-ink-3"}>control</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmittedBrief({ input, onEdit, result }: { input: CampaignInput; onEdit: () => void; result: AnalysisResult | null }) {
  return (
    <div className="border-y border-rule py-5">
      <p className="text-[0.82rem] text-ink-3">The campaign under review</p>
      <p className="mt-1 font-serif text-[1.7rem] leading-tight">{input.headline || input.productName}</p>
      <p className="mt-2 text-[0.92rem] text-ink-2">
        {[input.productName && `“${input.productName}”`, input.markets.map(marketName).join(", "), input.launchDate ? formatDate(input.launchDate) : "no launch date", CHANNEL_LABELS[input.channel].toLowerCase()]
          .filter(Boolean)
          .join(", ")}
      </p>
      {result && <p className={`mt-3 font-medium ${severityCounts(result.findings).critical > 0 ? "text-critical" : "text-ink"}`}>{verdictLine(result.findings)}</p>}
      <button type="button" onClick={onEdit} className="mt-3 text-[0.9rem] text-pencil underline underline-offset-4">
        Edit the brief
      </button>
    </div>
  );
}

export function ReviewApp({
  examples,
  incidents,
  uploadMode,
  analysisAvailable,
  generationAvailable,
}: {
  examples: readonly ExampleCase[];
  incidents: readonly IncidentSummary[];
  uploadMode: "blob" | "local";
  analysisAvailable: boolean;
  generationAvailable: boolean;
}) {
  const [values, setValues] = useState<BriefValues>(EMPTY_BRIEF);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [placedKey, setPlacedKey] = useState("none");
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>({ kind: "brief" });
  const [submitted, setSubmitted] = useState<CampaignInput | null>(null);
  const [fillKey, setFillKey] = useState(0);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeBox, setActiveBox] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollTo = useScrollTo();

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFile = async (file: File) => {
    setPreviewUrl(URL.createObjectURL(file));
    setPlacedKey(`${file.name}-${file.size}-${Date.now()}`);
    setActiveSlug(null);
    setImageUrl(null);
    setUpload({ status: "uploading" });
    setErrors((e) => ({ ...e, image: undefined }));
    try {
      const url = uploadMode === "blob" ? await uploadToBlob(file) : await uploadLocal(file);
      setImageUrl(url);
      setUpload({ status: "done" });
    } catch (err) {
      setUpload({ status: "error", message: err instanceof ApiRequestError ? err.message : "Upload failed. Try again." });
    }
  };

  const loadExample = (slug: string) => {
    const example = examples.find((c) => c.slug === slug);
    if (!example) return;
    const { input } = example;
    setValues({
      brandName: input.brandName ?? "",
      productName: input.productName,
      headline: input.headline,
      bodyCopy: input.bodyCopy,
      markets: [...input.markets],
      launchDate: input.launchDate ?? "",
      channel: input.channel,
      brandNotes: input.brandNotes ?? "",
    });
    setImageUrl(input.imageUrl);
    setPreviewUrl(input.imageUrl);
    setPlacedKey(slug);
    setActiveSlug(slug);
    setUpload({ status: "done" });
    setErrors({});
    setFillKey((k) => k + 1);
    setPhase({ kind: "brief" });
  };

  // `?case=<slug>` loads a case on arrival. Read on the client so the page itself stays static.
  const loadedInitial = useRef(false);
  useEffect(() => {
    if (loadedInitial.current) return;
    loadedInitial.current = true;
    const slug = new URLSearchParams(window.location.search).get("case");
    if (!slug || !examples.some((c) => c.slug === slug)) return;
    const t = setTimeout(() => loadExample(slug), 700);
    return () => clearTimeout(t);
    // Load once on arrival; loadExample is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const { input, errors: nextErrors } = toInput(values, imageUrl);
    setErrors(nextErrors);
    if (!input) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let progress = INITIAL_PROGRESS();
    setSubmitted(input);
    setPhase({ kind: "analyzing", progress });
    // Bring the light table back into view so the scan is visible.
    requestAnimationFrame(() => scrollTo(workspaceRef.current, 0));

    try {
      const result = await analyzeWithProgress(
        input,
        (event) => {
          progress = reduceProgress(progress, event);
          setPhase({ kind: "analyzing", progress });
        },
        controller.signal,
      );
      setPhase({ kind: "report", result });
      // Let the boxes draw on the light table, then glide down to the report.
      setTimeout(() => scrollTo(reportRef.current, -24), result.findings.some((f) => f.locus.kind === "image") ? 1400 : 700);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const e = err instanceof ApiRequestError ? err : new ApiRequestError("unknown", "The analysis failed. Try again.", 0);
      setPhase({ kind: "failed", code: e.code, message: e.message });
    }
  };

  const tableMode: TableMode =
    phase.kind === "analyzing"
      ? { kind: "scanning", ...progressCaption(phase.progress) }
      : phase.kind === "report"
        ? {
            kind: "reviewed",
            critical: severityCounts(phase.result.findings).critical > 0,
            summary:
              phase.result.findings.length === 0
                ? "Nothing flagged. Not an approval."
                : `${phase.result.findings.length} ${phase.result.findings.length === 1 ? "finding" : "findings"}, ${phase.result.findings.filter((f) => f.locus.kind === "image").length} in the image`,
            boxes: phase.result.findings.flatMap((f, i) =>
              f.locus.kind === "image" ? [{ id: f.id, label: String(i + 1), bbox: f.locus.bbox, description: f.locus.description }] : [],
            ),
          }
        : { kind: "idle" };

  const editing = phase.kind === "brief" || phase.kind === "failed";

  return (
    <>
      <section ref={workspaceRef} aria-labelledby="workspace-title" className="border-b border-rule">
        <div className="mx-auto grid max-w-[88rem] grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-7 px-5 pb-10 pt-8 [grid-template-areas:'title'_'table'_'work'] sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_1fr] lg:pb-14 lg:pt-10 lg:[grid-template-areas:'title_table'_'work_table']">
          <div className="min-w-0 [grid-area:title]">
            <div>
              <h1 id="workspace-title" className="font-serif text-[2.6rem] leading-[0.98] tracking-tight sm:text-[3.6rem] xl:text-[4.2rem]">
                <RiseLines lines={["Know what your ad means", "before it launches."]} />
              </h1>
              <p className="fade-up mt-5 max-w-[50ch] text-[1.1rem] leading-relaxed text-ink-2" style={{ animationDelay: "220ms" }}>
                Add the creative, product name, copy, markets and launch date. Second Look checks each one against local history, language and
                calendars, and shows the precedent behind anything it flags.
              </p>
            </div>
          </div>

          <div className="min-w-0 [grid-area:work]">
            <AnimatePresence mode="wait" initial={false}>
              {editing ? (
                <motion.div key="brief" className="flex flex-col gap-7" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
                  <ExampleChips examples={examples} onLoad={loadExample} activeSlug={activeSlug} disabled={false} />
                  <div className="fade-up" style={{ animationDelay: "480ms" }}>
                    <BriefForm
                      values={values}
                      onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
                      errors={errors}
                      onSubmit={submit}
                      submitting={false}
                      uploading={upload.status === "uploading"}
                      fillKey={fillKey}
                      analysisAvailable={analysisAvailable}
                    />
                  </div>
                  {phase.kind === "failed" && (
                    <motion.div role="alert" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }} transition={{ duration: 0.45 }} className="border-l-2 border-critical bg-critical-wash/60 px-4 py-3">
                      <p className="font-medium text-critical">{FAILURE_HELP[phase.code] ?? "The analysis didn't finish"}</p>
                      <p className="mt-1 max-w-[60ch] text-[0.95rem] text-ink">{phase.message}</p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="running" className="flex flex-col gap-7" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
                  {submitted && (
                    <SubmittedBrief
                      input={submitted}
                      result={phase.kind === "report" ? phase.result : null}
                      onEdit={() => {
                        abortRef.current?.abort();
                        setPhase({ kind: "brief" });
                      }}
                    />
                  )}
                  {phase.kind === "analyzing" && <AnalysisProgress progress={phase.progress} />}
                  {phase.kind === "report" && (
                    <button type="button" onClick={() => scrollTo(reportRef.current, -24)} className="self-start rounded-[6px] bg-ink px-5 py-3 text-paper">
                      Read the report
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="fade-up min-w-0 [grid-area:table]" style={{ animationDelay: "120ms" }}>
            <div className="lg:sticky lg:top-6 lg:h-[calc(100dvh-7.5rem)] lg:max-h-[56rem] lg:min-h-[34rem]">
              <LightTable
                imageUrl={previewUrl}
                mode={tableMode}
                upload={upload}
                onFile={onFile}
                onClear={() => {
                  setImageUrl(null);
                  setPreviewUrl(null);
                  setActiveSlug(null);
                  setUpload({ status: "idle" });
                }}
                placedKey={placedKey}
                activeBoxId={activeBox}
                onActivateBox={setActiveBox}
              />
            </div>
          </div>
        </div>
      </section>

      <div ref={reportRef} className="mx-auto max-w-[88rem] scroll-mt-4 px-5 sm:px-8">
        <AnimatePresence>
          {phase.kind === "report" && (
            <motion.div key={phase.result.id} className="pt-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Report result={phase.result} incidents={incidents} />
              {phase.result.findings.length > 0 && <GeneratePanel analysis={phase.result} enabled={generationAvailable} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
