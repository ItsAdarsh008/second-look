import "server-only";
import { nanoid } from "nanoid";
import { z } from "zod";
import { loadCreative } from "./clients/creative";
import {
  MagicHourError,
  editImage,
  estimateCredits,
  getImageProject,
  getUploadUrl,
  uploadImage,
} from "./clients/magicHour";
import { compileEditPrompt } from "./compile-edit-prompt";
import { reserveCredits, settleCredits } from "./limits";
import { log } from "./logger";
import {
  AnalysisResultSchema,
  EditJobSchema,
  MagicHourModelSchema,
  MagicHourResolutionSchema,
  type AnalysisResult,
  type EditJob,
} from "./schema";
import { ANALYSIS_TTL_SECONDS, JOB_TTL_SECONDS, getStore, keys } from "./store";

export const GenerateRequestSchema = z.object({
  analysisId: z.string().min(1).max(64),
  findingIds: z.array(z.string().min(1)).max(20).optional(),
  model: MagicHourModelSchema.default("default"),
  resolution: MagicHourResolutionSchema.default("auto"),
  imageCount: z.union([z.literal(1), z.literal(4)]).default(1),
  /** A hand-amended prompt from the re-run control. */
  promptOverride: z.string().trim().min(10).max(1500).optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export class GenerationError extends Error {
  readonly code: "analysis_not_found" | "nothing_addressable" | "shared_storage_required";
  readonly status: number;
  constructor(code: GenerationError["code"], message: string, status: number) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
    this.status = status;
  }
}

const TERMINAL = new Set(["complete", "error", "canceled"]);

export async function startGeneration(req: GenerateRequest): Promise<EditJob> {
  const store = getStore();

  // In production the credit ceiling must be shared across instances, or it isn't a ceiling.
  if (process.env.VERCEL && store.kind !== "redis") {
    throw new GenerationError(
      "shared_storage_required",
      "Generation is disabled on this deployment until shared storage (Upstash Redis) is configured.",
      503,
    );
  }

  const analysis = await store.getJSON(keys.analysis(req.analysisId), AnalysisResultSchema);
  if (!analysis) throw new GenerationError("analysis_not_found", "That analysis doesn't exist or has expired.", 404);

  const selected = req.findingIds?.length
    ? analysis.findings.filter((f) => req.findingIds?.includes(f.id))
    : analysis.findings;
  const compiled = compileEditPrompt(selected, analysis.input);
  const prompt = req.promptOverride ?? compiled.prompt;
  if (!prompt) {
    throw new GenerationError(
      "nothing_addressable",
      "None of the selected findings can be addressed by editing the image. They need copy or scheduling changes.",
      422,
    );
  }

  const estimate = estimateCredits(req.model, req.imageCount);
  const { day } = await reserveCredits(estimate, store);

  try {
    const filePath = analysis.input.imageFilePath ?? (await uploadCreative(analysis));
    const submitted = await editImage({
      prompt,
      imageFilePaths: [filePath],
      model: req.model,
      resolution: req.resolution,
      imageCount: req.imageCount,
      aspectRatio: "auto",
      name: `Second Look ${analysis.id}`,
    });
    await settleCredits(day, estimate, submitted.creditsCharged, store);

    const now = new Date().toISOString();
    const job = EditJobSchema.parse({
      id: nanoid(12),
      analysisId: analysis.id,
      magicHourProjectId: submitted.id,
      prompt,
      model: req.model,
      resolution: req.resolution,
      imageCount: req.imageCount,
      findingIds: req.promptOverride ? selected.map((f) => f.id) : compiled.addressed.map((f) => f.id),
      requestBody: submitted.body,
      status: "queued",
      creditsCharged: submitted.creditsCharged,
      downloads: [],
      error: null,
      createdAt: now,
      updatedAt: now,
      pollLog: [{ at: now, status: "queued" }],
    });
    await store.setJSON(keys.job(job.id), job, JOB_TTL_SECONDS);
    log.info("generation.submitted", {
      jobId: job.id,
      analysisId: analysis.id,
      model: req.model,
      imageCount: req.imageCount,
      credits: submitted.creditsCharged,
      findings: job.findingIds.length,
      amended: Boolean(req.promptOverride),
    });
    return job;
  } catch (err) {
    await settleCredits(day, estimate, 0, store);
    throw err;
  }
}

async function uploadCreative(analysis: AnalysisResult): Promise<string> {
  const creative = await loadCreative(analysis.input.imageUrl);
  const upload = await getUploadUrl(creative.extension);
  await uploadImage(upload.uploadUrl, creative.bytes, creative.mediaType);
  // Remember the Magic Hour path so re-runs skip the upload.
  const updated: AnalysisResult = { ...analysis, input: { ...analysis.input, imageFilePath: upload.filePath } };
  await getStore().setJSON(keys.analysis(analysis.id), updated, ANALYSIS_TTL_SECONDS);
  return upload.filePath;
}

export async function getJob(jobId: string): Promise<EditJob | null> {
  return getStore().getJSON(keys.job(jobId), EditJobSchema);
}

/** Poll Magic Hour once and persist what changed. Terminal jobs are returned as-is. */
export async function refreshJob(job: EditJob): Promise<EditJob> {
  if (TERMINAL.has(job.status)) return job;
  const started = Date.now();
  let project;
  try {
    project = await getImageProject(job.magicHourProjectId);
  } catch (err) {
    if (err instanceof MagicHourError && (err.code === "rate_limited" || err.code === "network" || err.code === "server_error")) {
      return job; // transient: the client will poll again
    }
    throw err;
  }

  const now = new Date().toISOString();
  const updated: EditJob = {
    ...job,
    status: project.status,
    creditsCharged: project.creditsCharged || job.creditsCharged,
    downloads: project.downloads,
    error: project.status === "error" ? (project.error ?? { code: "render_failed", message: "Render failed." }) : null,
    updatedAt: now,
    pollLog: job.pollLog.at(-1)?.status === project.status ? job.pollLog : [...job.pollLog, { at: now, status: project.status }],
  };
  await getStore().setJSON(keys.job(job.id), updated, JOB_TTL_SECONDS);
  if (updated.status !== job.status) {
    log.info("generation.polled", { jobId: job.id, status: updated.status, credits: updated.creditsCharged, latencyMs: Date.now() - started });
  }
  return updated;
}
