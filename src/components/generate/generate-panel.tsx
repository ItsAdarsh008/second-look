"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ApiRequestError, fetchWallet, pollGeneration, startGeneration } from "@/lib/clients/secondlook";
import { compileEditPrompt } from "@/lib/compile-edit-prompt";
import {
  MODEL_CREDITS_PER_IMAGE,
  MODEL_DESCRIPTIONS,
  buildEditRequestBody,
  type EditImageRequestBody,
} from "@/lib/magic-hour-shared";
import { CATEGORY_LABEL } from "@/lib/report";
import {
  MAGIC_HOUR_MODELS,
  MAGIC_HOUR_RESOLUTIONS,
  type AnalysisResult,
  type EditJob,
  type MagicHourModel,
  type MagicHourResolution,
} from "@/lib/schema";
import { reviewsLabel, useBilling } from "../billing/billing";
import { SeverityTag } from "../report/finding-card";
import { ApiPanel, type ApiActivity } from "./api-panel";
import { BeforeAfter } from "./before-after";
import { PoweredByMagicHour } from "./powered-by-magic-hour";

const POLL_MS = 2500;
const CLIENT_TIMEOUT_MS = 180_000;

type Failure = { code: string; message: string; retry: boolean };

function failureFrom(err: unknown): Failure {
  if (!(err instanceof ApiRequestError)) return { code: "unknown", message: "Something went wrong starting the generation.", retry: true };
  switch (err.code) {
    case "magic_hour_out_of_credits":
      return { code: err.code, message: "The Magic Hour account behind this demo is out of credits. Generation is paused until it's topped up.", retry: false };
    case "daily_credit_ceiling":
    case "render_payment_required":
      return { code: err.code, message: err.message, retry: false };
    case "rate_limited":
    case "magic_hour_rate_limited":
      return { code: err.code, message: err.message, retry: true };
    case "magic_hour_plan_upgrade_required":
    case "magic_hour_subscription_required":
      return { code: err.code, message: "That model isn't available on this demo's Magic Hour plan. Choose another model and try again.", retry: false };
    case "nothing_addressable":
    case "shared_storage_required":
    case "magic_hour_not_configured":
      return { code: err.code, message: err.message, retry: false };
    default:
      return { code: err.code, message: err.message, retry: true };
  }
}

const FAILURE_TITLE: Record<string, string> = {
  magic_hour_out_of_credits: "Out of credits",
  daily_credit_ceiling: "Daily budget reached",
  render_payment_required: "No alternatives left on this review",
  rate_limited: "Rate limited",
  magic_hour_rate_limited: "Rate limited",
  timeout: "Still rendering",
  render_error: "Render failed",
};

export function GeneratePanel({ analysis, enabled }: { analysis: AnalysisResult; enabled: boolean }) {
  const compiledAll = useMemo(() => compileEditPrompt(analysis.findings, analysis.input), [analysis]);
  const imageFindings = useMemo(() => [...compiledAll.addressed, ...compiledAll.deferred], [compiledAll]);
  const indexOf = (id: string) => analysis.findings.findIndex((f) => f.id === id) + 1;

  const [selected, setSelected] = useState<string[]>(() => compiledAll.addressed.map((f) => f.id));
  const [model, setModel] = useState<MagicHourModel>("flux-2-klein");
  const [resolution, setResolution] = useState<MagicHourResolution>("1k");
  const [imageCount, setImageCount] = useState<1 | 4>(1);

  const compiled = useMemo(
    () => compileEditPrompt(analysis.findings.filter((f) => f.locus.kind !== "image" || selected.includes(f.id)), analysis.input),
    [analysis, selected],
  );

  const [job, setJob] = useState<EditJob | null>(null);
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [shown, setShown] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ids = useId();

  const stopPolling = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
  };
  useEffect(() => stopPolling, []);

  // With a paywall, each review includes an alternative; more cost a review each.
  const billing = useBilling();
  const paywall = billing !== null;
  const refreshWallet = billing?.refresh;
  const [included, setIncluded] = useState<number | null>(null);
  const loadIncluded = useCallback(() => {
    if (!paywall) return;
    fetchWallet(analysis.id)
      .then((w) => setIncluded(w.renders ?? 0))
      .catch(() => {});
  }, [paywall, analysis.id]);
  useEffect(() => loadIncluded(), [loadIncluded]);
  // A render Magic Hour couldn't finish is refunded on the server when the poll sees it fail.
  const jobStatus = job?.status;
  useEffect(() => {
    if (jobStatus !== "error" && jobStatus !== "canceled") return;
    loadIncluded();
    void refreshWallet?.();
  }, [jobStatus, loadIncluded, refreshWallet]);
  useEffect(() => {
    if (editing) document.getElementById(`${ids}-amend`)?.focus();
  }, [editing, ids]);

  const poll = useCallback((jobId: string, startedAt: number) => {
    stopPolling();
    pollTimer.current = setTimeout(async () => {
      try {
        const next = await pollGeneration(jobId);
        setJob(next);
        if (next.status === "complete" || next.status === "error" || next.status === "canceled") return;
        if (Date.now() - startedAt > CLIENT_TIMEOUT_MS) {
          setTimedOut(true);
          return;
        }
      } catch {
        /* transient; keep polling */
      }
      poll(jobId, startedAt);
    }, POLL_MS);
  }, []);

  const submit = async (promptOverride?: string) => {
    if (billing && included === 0 && billing.wallet?.reviews === 0) {
      billing.openPricing("render");
      return;
    }
    setSubmitting(true);
    setFailure(null);
    setTimedOut(false);
    setJob(null);
    setShown(0);
    const submittedAt = Date.now();
    setActivity({ submittedAt, respondedAt: null, projectId: null, creditsCharged: null });
    try {
      const res = await startGeneration({
        analysisId: analysis.id,
        findingIds: selected,
        model,
        resolution,
        imageCount,
        ...(promptOverride ? { promptOverride } : {}),
      });
      setActivity({ submittedAt, respondedAt: Date.now(), projectId: res.magicHourProjectId, creditsCharged: res.creditsCharged });
      setJob(res.job);
      setEditing(false);
      poll(res.jobId, Date.now());
      loadIncluded();
      void refreshWallet?.();
    } catch (err) {
      setActivity(null);
      setFailure(failureFrom(err));
      loadIncluded();
      void refreshWallet?.();
      if (err instanceof ApiRequestError && err.code === "render_payment_required") billing?.openPricing("render");
    } finally {
      setSubmitting(false);
    }
  };

  const perImage = MODEL_CREDITS_PER_IMAGE[model];
  const costLine =
    perImage === null
      ? `Cost depends on the model Magic Hour picks; the exact charge appears in the response.`
      : `This run uses ${perImage * imageCount} Magic Hour credits (${perImage} per image).`;

  const previewBody: EditImageRequestBody = job
    ? (job.requestBody as unknown as EditImageRequestBody)
    : buildEditRequestBody({
        prompt: (editing ? draftPrompt : compiled.prompt) || "(select at least one image finding)",
        imageFilePaths: [analysis.input.imageFilePath ?? "api-assets/<assigned-on-upload>.png"],
        model,
        resolution,
        imageCount,
        aspectRatio: "auto",
        name: `Second Look ${analysis.id}`,
      });

  const running = Boolean(job) && (job?.status === "queued" || job?.status === "rendering" || job?.status === "draft");
  const complete = job?.status === "complete" && job.downloads.length > 0;
  const renderFailed = job?.status === "error" || job?.status === "canceled";
  const addressedIds = job?.findingIds ?? [];
  const stillOpen = analysis.findings.filter((f) => !addressedIds.includes(f.id));
  const nothingAddressable = imageFindings.length === 0;

  return (
    <section aria-labelledby={`${ids}-title`} className="mt-16 border-t-2 border-ink pt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <h2 id={`${ids}-title`} className="font-serif text-[2.2rem] leading-none sm:text-[2.6rem]">
          Alternatives to consider
        </h2>
        <PoweredByMagicHour />
      </div>
      <p className="mt-3 max-w-[66ch] text-ink-2">
        Magic Hour turns a review note into a picture the team can react to in the meeting. It changes only what an image edit can change,
        and the result is a draft to discuss, with the report still attached.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="font-medium">Image editing can address</h3>
          {nothingAddressable ? (
            <p className="mt-2 rounded-[4px] border border-dashed border-rule-strong px-4 py-3 text-[0.95rem] text-ink-2">
              None of the findings live in the image, so there is nothing for an image edit to do. That was true of Tank Day too.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {imageFindings.map((f) => {
                const checked = selected.includes(f.id);
                return (
                  <li key={f.id}>
                    <label className={`flex cursor-pointer gap-3 rounded-[4px] border px-3.5 py-3 ${checked ? "border-ink bg-sheet" : "border-rule"}`}>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-[var(--ink)]"
                        checked={checked}
                        disabled={running || submitting}
                        onChange={() => setSelected((s) => (checked ? s.filter((x) => x !== f.id) : [...s, f.id]))}
                      />
                      <span>
                        <span className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                          <span className="font-semibold text-ink">{indexOf(f.id)}</span>
                          <SeverityTag severity={f.severity} />
                          {CATEGORY_LABEL[f.category]}
                        </span>
                        <span className="mt-1 block text-[0.97rem] text-ink">{f.fixDirective}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <h3 className="font-medium">Needs a copy or scheduling change</h3>
          {compiledAll.unaddressable.length === 0 ? (
            <p className="mt-2 text-[0.95rem] text-ink-3">Every finding lives in the image.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {compiledAll.unaddressable.map((f) => {
                // Words set in the artwork get the sharper sentence: the render struck them, and
                // the decision they record is still standing. Saying only "cannot resolve this"
                // beside a render that visibly changed those words would read as a contradiction.
                const printed = compiledAll.printed.find((p) => p.id === f.id);
                return (
                  <li key={f.id} className="rounded-[4px] border border-critical/35 bg-critical-wash/50 px-3.5 py-3">
                    <span className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                      <span className="font-semibold text-ink">{indexOf(f.id)}</span>
                      <SeverityTag severity={f.severity} />
                      {CATEGORY_LABEL[f.category]}
                      {printed && <span className="rounded-[3px] border border-rule px-1.5 py-0.5 font-mono text-[0.72rem] text-ink-3">printed in the ad</span>}
                    </span>
                    <span className="mt-1 block text-[0.97rem] text-ink">{f.claim}</span>
                    <span className="mt-1 block text-sm font-medium text-critical">{printed?.explanation ?? f.explanation}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {!nothingAddressable && (
        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="space-y-6">
            <fieldset disabled={running || submitting}>
              <legend className="font-medium">Model</legend>
              <div className="mt-2 space-y-1.5">
                {MAGIC_HOUR_MODELS.map((m) => (
                  <label key={m} className={`block cursor-pointer rounded-[4px] border px-3.5 py-2.5 ${model === m ? "border-ink bg-sheet" : "border-rule hover:border-rule-strong"}`}>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <input type="radio" name={`${ids}-model`} value={m} checked={model === m} onChange={() => setModel(m)} className="accent-[var(--ink)]" />
                        <span className="font-mono text-[0.88rem]">{m}</span>
                      </span>
                      <span className="text-sm text-ink-3">{MODEL_CREDITS_PER_IMAGE[m] === null ? "varies" : `${MODEL_CREDITS_PER_IMAGE[m]} credits`}</span>
                    </span>
                    <span className="mt-0.5 block pl-6 text-sm text-ink-2">{MODEL_DESCRIPTIONS[m]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-4">
              <fieldset disabled={running || submitting}>
                <legend className="font-medium">Images</legend>
                <div className="mt-2 inline-flex overflow-hidden rounded-[4px] border border-rule">
                  {([1, 4] as const).map((n) => (
                    <label key={n} className={`cursor-pointer px-4 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pencil ${imageCount === n ? "bg-ink text-paper" : "bg-sheet text-ink"}`}>
                      <input type="radio" className="sr-only" name={`${ids}-count`} checked={imageCount === n} onChange={() => setImageCount(n)} />
                      {n}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor={`${ids}-res`} className="font-medium">
                  Resolution
                </label>
                <select
                  id={`${ids}-res`}
                  value={resolution}
                  disabled={running || submitting}
                  onChange={(e) => setResolution(e.target.value as MagicHourResolution)}
                  className="mt-2 block w-full rounded-[4px] border border-rule bg-sheet px-2.5 py-2 text-sm"
                >
                  {MAGIC_HOUR_RESOLUTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-rule pt-5">
              <p className="text-sm text-ink-2">{costLine}</p>
              {billing && included !== null && (
                <p className="mt-1 text-sm text-ink-2">
                  {included > 0 ? (
                    "Included with this review."
                  ) : billing.wallet && billing.wallet.reviews > 0 ? (
                    `Another alternative uses 1 of your ${reviewsLabel(billing.wallet.reviews)}.`
                  ) : (
                    <>
                      This review’s included alternative is used. Another costs one review.{" "}
                      <button type="button" onClick={() => billing.openPricing("render")} className="text-pencil underline underline-offset-2">
                        Buy reviews
                      </button>
                    </>
                  )}
                </p>
              )}
              <button
                type="button"
                onClick={() => submit()}
                disabled={!enabled || submitting || running || selected.length === 0 || !compiled.prompt}
                className="mt-3 w-full rounded-[5px] bg-ink px-5 py-3 font-medium text-paper hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Sending to Magic Hour…" : running ? "Rendering…" : imageCount === 4 ? "Generate 4 alternatives" : "Generate an alternative"}
              </button>
              {!enabled && <p className="mt-2 text-sm text-ink-3">Generation isn&rsquo;t configured on this deployment. The request is shown in full on the right.</p>}
              {selected.length === 0 && enabled && <p className="mt-2 text-sm text-ink-3">Select at least one image finding.</p>}
              {!editing && compiled.prompt && (
                <button
                  type="button"
                  className="mt-3 text-sm text-pencil underline underline-offset-2"
                  onClick={() => {
                    setDraftPrompt(compiled.prompt);
                    setEditing(true);
                  }}
                >
                  Edit the prompt by hand
                </button>
              )}
            </div>
          </div>

          <ApiPanel body={previewBody} pending={!job} job={job} activity={activity} />
        </div>
      )}

      {(failure || timedOut || renderFailed) && (
        <div role="alert" className="mt-8 rounded-[4px] border border-critical/50 bg-critical-wash/60 px-5 py-4">
          <p className="font-medium text-critical">
            {timedOut ? FAILURE_TITLE.timeout : renderFailed ? FAILURE_TITLE.render_error : (FAILURE_TITLE[failure?.code ?? ""] ?? "Generation didn't start")}
          </p>
          <p className="mt-1 text-ink">
            {timedOut
              ? "Magic Hour has been rendering for over three minutes. The job may still finish."
              : renderFailed
                ? `${job?.error?.message ?? "Magic Hour couldn't render this edit."} Credits for failed renders are refunded by Magic Hour. Try another model or amend the prompt.`
                : failure?.message}
          </p>
          <div className="mt-3 flex gap-4 text-sm">
            {timedOut && job && (
              <button type="button" className="text-pencil underline underline-offset-2" onClick={() => { setTimedOut(false); poll(job.id, Date.now()); }}>
                Check again
              </button>
            )}
            {(renderFailed || failure?.retry) && (
              <button type="button" className="text-pencil underline underline-offset-2" onClick={() => submit()}>
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {complete && job && (
        <div className="mt-12">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
            <div>
              <BeforeAfter before={analysis.input.imageUrl} after={job.downloads[shown].url} />
              {job.downloads.length > 1 && (
                <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="Alternatives">
                  {job.downloads.map((d, i) => (
                    <li key={d.url}>
                      <button
                        type="button"
                        onClick={() => setShown(i)}
                        aria-pressed={shown === i}
                        aria-label={`Show alternative ${i + 1}`}
                        className={`block w-full overflow-hidden rounded-[3px] border-2 ${shown === i ? "border-ink" : "border-transparent"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- expiring third-party download URLs; next/image can't optimize them */}
                        <img src={d.url} alt="" className="aspect-[4/5] w-full object-cover" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <aside className="space-y-4">
              <p className="inline-block rounded-[3px] bg-ink px-2 py-0.5 text-sm text-paper">Alternative to consider</p>
              <div>
                <h3 className="font-medium">What this draft responds to</h3>
                <ul className="mt-1.5 space-y-1 text-[0.95rem] text-ink-2">
                  {analysis.findings
                    .filter((f) => addressedIds.includes(f.id))
                    .map((f) => (
                      <li key={f.id}>
                        {indexOf(f.id)}. {f.claim}
                      </li>
                    ))}
                </ul>
              </div>
              {stillOpen.length > 0 && (
                <div>
                  <h3 className="font-medium text-critical">Still open</h3>
                  <p className="mt-1 text-[0.95rem] text-ink-2">
                    {stillOpen.length} {stillOpen.length === 1 ? "finding is" : "findings are"} untouched by this image, including anything in the copy or the launch date.
                  </p>
                </div>
              )}
              <p className="text-sm text-ink-3">
                {job.model}, {job.creditsCharged} credits. Download links from Magic Hour expire.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={job.downloads[shown].url} download target="_blank" rel="noreferrer" className="rounded-[5px] border border-ink px-4 py-2 text-sm font-medium">
                  Download this alternative
                </a>
                <button
                  type="button"
                  className="rounded-[5px] border border-rule px-4 py-2 text-sm"
                  onClick={() => {
                    setDraftPrompt(job.prompt);
                    setEditing(true);
                  }}
                >
                  Amend the prompt
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}

      {editing && (
        <div className="mt-8 rounded-[6px] border border-rule bg-sheet p-5">
          <label htmlFor={`${ids}-amend`} className="font-medium">
            Amend the prompt and run it again
          </label>
          <p className="mt-1 text-sm text-ink-3">The edited text goes to Magic Hour as-is, in style.prompt. The request panel updates as you type.</p>
          <textarea
            id={`${ids}-amend`}
            rows={6}
            maxLength={1500}
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            className="mt-3 w-full rounded-[4px] border border-rule bg-paper px-3 py-2.5 font-mono text-[0.88rem] leading-relaxed"
          />
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={!enabled || submitting || draftPrompt.trim().length < 10}
              onClick={() => submit(draftPrompt.trim())}
              className="rounded-[5px] bg-ink px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-50"
            >
              Generate with this prompt
            </button>
            <button type="button" className="text-sm text-ink-3 underline underline-offset-2" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <span className="text-sm text-ink-3">{draftPrompt.length} / 1500</span>
          </div>
        </div>
      )}
    </section>
  );
}
