"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { creativeUrl } from "@/data/cases/creative";
import { ApiRequestError, analyzeWithProgress, uploadLocal, uploadToBlob } from "@/lib/clients/secondlook";
import { formatDate } from "@/lib/format";
import { severityCounts, verdictLine } from "@/lib/report";
import type { ExampleCase } from "@/lib/examples";
import { CHANNEL_LABELS, CampaignInputSchema, marketName, type AnalysisResult, type CampaignInput } from "@/lib/schema";
import { NEW_PROGRESS, stepSpot, type Guess, type SpotProgress } from "@/lib/spot";
import { useBilling } from "../billing/billing";
import { BriefForm, EMPTY_BRIEF, type BriefValues, type FieldErrors } from "../brief/brief-form";
import { GeneratePanel } from "../generate/generate-panel";
import { LightTable, type TableMode, type UploadState } from "../light-table/light-table";
import { EASE_OUT, RiseLines } from "../motion/primitives";
import { useScrollTo } from "../motion/providers";
import { Report, type IncidentSummary } from "../report/report";
import { CaseBrief } from "../spot/case-brief";
import { UploadCard } from "./upload-card";
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
  image_unavailable: "The creative couldn't be read",
  refused: "The model declined this one",
  not_configured: "Analysis isn't configured",
  payment_required: "No reviews left",
};

function toInput(values: BriefValues, imageUrl: string | null): { input: CampaignInput | null; errors: FieldErrors } {
  const errors: FieldErrors = {};
  if (!imageUrl) errors.image = "Put the ad on the light table first. Second Look reads its copy from the creative.";
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

function briefFrom(input: CampaignInput): BriefValues {
  return {
    brandName: input.brandName ?? "",
    productName: input.productName,
    headline: input.headline,
    bodyCopy: input.bodyCopy,
    markets: [...input.markets],
    launchDate: input.launchDate ?? "",
    channel: input.channel,
    brandNotes: input.brandNotes ?? "",
  };
}

function SubmittedBrief({ input, onEdit, result }: { input: CampaignInput; onEdit: () => void; result: AnalysisResult | null }) {
  return (
    <div className="border-y border-rule py-5">
      <p className="text-[0.82rem] text-ink-3">The campaign under review</p>
      <p className="mt-1 font-serif text-[1.7rem] leading-tight">{input.headline || input.productName || "Your creative"}</p>
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
  // The first case starts on the table, so "Can you spot the issue?" is the first thing on screen.
  const first = examples[0] ?? null;
  const [values, setValues] = useState<BriefValues>(() => (first ? briefFrom(first.input) : EMPTY_BRIEF));
  const [imageUrl, setImageUrl] = useState<string | null>(first?.input.imageUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(first?.input.imageUrl ?? null);
  const [placedKey, setPlacedKey] = useState(first?.slug ?? "none");
  const [upload, setUpload] = useState<UploadState>(first ? { status: "done" } : { status: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>({ kind: "brief" });
  const [submitted, setSubmitted] = useState<CampaignInput | null>(null);
  const [fillKey, setFillKey] = useState(0);
  const [activeSlug, setActiveSlug] = useState<string | null>(first?.slug ?? null);
  const [activeBox, setActiveBox] = useState<string | null>(null);
  /** Spot-the-issue play per case, kept while switching between them. */
  const [plays, setPlays] = useState<Record<string, SpotProgress>>({});
  const reportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollTo = useScrollTo();
  const billing = useBilling();

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /** Leaving a case: its copy and notes must not ride along with the user's own creative. */
  const dropCaseCopy = () => {
    if (!activeSlug) return;
    setValues((v) => ({ ...v, productName: "", headline: "", bodyCopy: "", brandName: "", brandNotes: "" }));
    setActiveSlug(null);
  };

  const onFile = async (file: File) => {
    setPreviewUrl(URL.createObjectURL(file));
    setPlacedKey(`${file.name}-${file.size}-${Date.now()}`);
    dropCaseCopy();
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
    setValues(briefFrom(input));
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
    // Out of reviews: offer more rather than send a request the server would refuse.
    if (billing?.allowance === 0) {
      billing.openPricing("review");
      return;
    }

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
      void billing?.refresh();
      // Let the boxes draw on the light table, then glide down to the report.
      setTimeout(() => scrollTo(reportRef.current, -24), result.findings.some((f) => f.locus.kind === "image") ? 1400 : 700);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const e = err instanceof ApiRequestError ? err : new ApiRequestError("unknown", "The analysis failed. Try again.", 0);
      setPhase({ kind: "failed", code: e.code, message: e.message });
      // A failed review was refunded; a refused one means the allowance we showed was stale.
      void billing?.refresh();
      if (e.code === "payment_required") billing?.openPricing("review");
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
  const active = examples.find((c) => c.slug === activeSlug) ?? null;
  // "Can you spot the issue?" runs on a case until it's sent for review.
  const spot = editing && tableMode.kind === "idle" ? (active?.spot ?? null) : null;
  const progress = (activeSlug && plays[activeSlug]) || NEW_PROGRESS;
  const play = (action: { type: "guess"; guess: Guess } | { type: "show" }) => {
    if (!spot || !activeSlug) return;
    setPlays((all) => ({ ...all, [activeSlug]: stepSpot(spot, all[activeSlug] ?? NEW_PROGRESS, action) }));
  };
  // The next case not yet played, after this one.
  const rounds = examples.filter((c) => c.spot);
  const at = rounds.findIndex((c) => c.slug === activeSlug);
  const nextRound = rounds.map((_, k) => rounds[(at + 1 + k) % rounds.length]).find((c) => c.slug !== activeSlug && !plays[c.slug]?.outcome);
  const goTo = (slug: string) => {
    loadExample(slug);
    // On narrow screens the result sits below the picture; bring the new case into view.
    if ((tableRef.current?.getBoundingClientRect().top ?? 0) < 0) scrollTo(tableRef.current, -12);
  };
  const next = nextRound
    ? { label: "Next case", onClick: () => goTo(nextRound.slug) }
    : {
        label: "Play again",
        onClick: () => {
          setPlays({});
          if (rounds[0]) goTo(rounds[0].slug);
        },
      };

  return (
    <>
      <section ref={workspaceRef} aria-labelledby="workspace-title" className="border-b border-rule">
        <div className="mx-auto grid max-w-[88rem] grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-5 px-5 pb-10 pt-6 [grid-template-areas:'title'_'table'_'work'] sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_1fr] lg:pb-14 lg:pt-6 lg:[grid-template-areas:'title_table'_'work_table']">
          <div className="min-w-0 [grid-area:title]">
            <div>
              <h1 id="workspace-title" className="font-serif text-[2.1rem] leading-[1.02] tracking-tight sm:text-[2.5rem] xl:text-[2.8rem]">
                <RiseLines lines={["Cultural risk review for ad campaigns"]} />
              </h1>
              <p className="fade-up mt-2.5 max-w-[58ch] text-[1rem] leading-relaxed text-ink-2" style={{ animationDelay: "220ms" }}>
                Second Look reads an ad&rsquo;s picture, words and launch date against each market&rsquo;s history, and cites the precedent for every
                flag.
              </p>
            </div>
          </div>

          <div className="min-w-0 [grid-area:work]">
            <AnimatePresence mode="wait" initial={false}>
              {editing ? (
                <motion.div key="brief" className="flex flex-col gap-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
                  <UploadCard onFile={onFile} own={!activeSlug && previewUrl ? { previewUrl, upload } : null} />
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
                      title={active ? `${active.input.brandName ?? active.title}’s brief` : "Your ad’s brief"}
                      lead={active && <CaseBrief values={values} fillKey={fillKey} spot={spot && { key: spot, progress, onGuess: (guess) => play({ type: "guess", guess }) }} />}
                      readOnly={Boolean(active)}
                      pinnable={!spot || progress.outcome !== null}
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

          <div ref={tableRef} className="fade-up min-w-0 [grid-area:table]" style={{ animationDelay: "120ms" }}>
            <div className="lg:sticky lg:top-6 lg:h-[calc(100dvh-6.5rem)] lg:max-h-[56rem] lg:min-h-[34rem]">
              <LightTable
                imageUrl={previewUrl}
                mode={tableMode}
                upload={upload}
                onFile={onFile}
                onClear={() => {
                  setImageUrl(null);
                  setPreviewUrl(null);
                  dropCaseCopy();
                  setUpload({ status: "idle" });
                }}
                placedKey={placedKey}
                activeBoxId={activeBox}
                onActivateBox={setActiveBox}
                cases={
                  editing
                    ? {
                        tabs: rounds.map((c) => ({
                          slug: c.slug,
                          name: c.input.brandName ?? c.title,
                          thumb: creativeUrl(c.slug, "thumb"),
                          outcome: plays[c.slug]?.outcome?.kind ?? null,
                        })),
                        active: activeSlug,
                        onPick: goTo,
                      }
                    : null
                }
                spot={
                  spot && {
                    spot,
                    progress,
                    onGuess: (guess) => play({ type: "guess", guess }),
                    onShow: () => play({ type: "show" }),
                    next,
                    onRun: analysisAvailable ? submit : null,
                  }
                }
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
