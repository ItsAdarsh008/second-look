import "server-only";
import { nanoid } from "nanoid";
import { z } from "zod";
import { INCIDENTS } from "@/data/incidents";
import { checkCalendar } from "./calendar";
import {
  ANALYST_MODEL,
  AnthropicClientError,
  createMessage as defaultCreateMessage,
  type CreateMessage,
  type CreateMessageParams,
  type ModelMessage,
} from "./clients/anthropic";
import { CreativeError, loadCreative, toVisionImage } from "./clients/creative";
import { log } from "./logger";
import {
  ANALYST_SYSTEM_PROMPT,
  REVIEW_TOOL_DESCRIPTION,
  REVIEW_TOOL_NAME,
  ReviewSubmissionSchema,
  buildCampaignBrief,
  reviewToolInputSchema,
  type ReviewSubmission,
} from "./prompts/analyst";
import { rankIncidents } from "./retrieval";
import {
  AnalysisResultSchema,
  SEVERITY_RANK,
  type AnalysisResult,
  type CalendarHit,
  type CampaignInput,
  type Finding,
  type FindingDraft,
  type Incident,
  type Precedent,
} from "./schema";

export type AnalysisErrorCode =
  | "not_configured"
  | "image_unavailable"
  | "not_ad_creative"
  | "refused"
  | "invalid_output"
  | "rate_limited"
  | "upstream_unavailable";

const HTTP_STATUS: Record<AnalysisErrorCode, number> = {
  not_configured: 503,
  image_unavailable: 422,
  not_ad_creative: 422,
  refused: 422,
  invalid_output: 502,
  rate_limited: 429,
  upstream_unavailable: 503,
};

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;
  readonly status: number;

  constructor(code: AnalysisErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AnalysisError";
    this.code = code;
    this.status = HTTP_STATUS[code];
  }
}

export type AnalysisStageEvent =
  | {
      stage: "retrieval";
      incidents: { id: string; brand: string; title: string; year: number; region: string; matchedSignals: string[] }[];
    }
  | { stage: "calendar"; launchDate: string | null; hits: CalendarHit[] }
  | { stage: "creative" }
  | { stage: "model"; model: string; attempt: number }
  | { stage: "validating" };

export interface VisionImage {
  data: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
}

export interface AnalyzeOptions {
  createMessage?: CreateMessage;
  loadImage?: (imageUrl: string) => Promise<VisionImage>;
  /** Leave-one-out retrieval for evals. */
  excludeIncidentIds?: readonly string[];
  onStage?: (event: AnalysisStageEvent) => void;
  corpus?: readonly Incident[];
  id?: string;
  now?: () => Date;
}

const MAX_ATTEMPTS = 2;
const REASONING_CONFIDENCE_CAP = 0.5;

async function defaultLoadImage(imageUrl: string): Promise<VisionImage> {
  return toVisionImage(await loadCreative(imageUrl));
}

function mapClientError(err: AnthropicClientError): AnalysisError {
  switch (err.code) {
    case "not_configured":
      return new AnalysisError("not_configured", "Analysis is not configured on this deployment.", { cause: err });
    case "rate_limited":
      return new AnalysisError("rate_limited", "The analysis model is busy. Try again in a minute.", { cause: err });
    case "bad_request":
      return new AnalysisError("invalid_output", "The analysis request was rejected upstream.", { cause: err });
    default:
      return new AnalysisError("upstream_unavailable", "The analysis model is unavailable right now. Try again shortly.", {
        cause: err,
      });
  }
}

type AttemptOutcome =
  | { ok: true; submission: ReviewSubmission }
  | { ok: false; feedback: CreateMessageParams["messages"][number]; reason: string };

function readAttempt(message: ModelMessage): AttemptOutcome {
  const toolUse = message.content.find(
    (block): block is Extract<ModelMessage["content"][number], { type: "tool_use" }> =>
      block.type === "tool_use" && block.name === REVIEW_TOOL_NAME,
  );

  if (!toolUse) {
    const reason = message.stop_reason === "max_tokens" ? "ran out of output tokens before calling the tool" : "did not call the tool";
    return {
      ok: false,
      reason,
      feedback: {
        role: "user",
        content: `You ${reason}. Call ${REVIEW_TOOL_NAME} exactly once now with your complete review. Keep rationales concise.`,
      },
    };
  }

  const parsed = ReviewSubmissionSchema.safeParse(toolUse.input);
  if (parsed.success) return { ok: true, submission: parsed.data };

  const errors = z.prettifyError(parsed.error);
  return {
    ok: false,
    reason: "schema validation failed",
    feedback: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUse.id,
          is_error: true,
          content: `The review did not match the required schema, so nothing was recorded:\n${errors}\n\nCall ${REVIEW_TOOL_NAME} again with the complete, corrected review. Every finding needs at least one precedent.`,
        },
      ],
    },
  };
}

/**
 * Enforce grounding rules the schema can't express:
 * - corpus precedents take brand, year and URL from the corpus, not the model;
 * - URLs not present in the reference material are dropped (never show an unverifiable link);
 * - reasoning-only findings are capped in confidence;
 * - markets are restricted to the campaign's markets;
 * - copy excerpts are re-homed to the field that actually contains them.
 */
export function groundFindings(
  drafts: readonly FindingDraft[],
  input: CampaignInput,
  corpus: readonly Incident[],
  calendarHits: readonly CalendarHit[],
  makeId: () => string = () => `f_${nanoid(10)}`,
): Finding[] {
  const byId = new Map(corpus.map((i) => [i.id, i]));
  const knownUrls = new Set<string>([
    ...corpus.map((i) => i.sourceUrl),
    ...calendarHits.flatMap((h) => (h.sourceUrl ? [h.sourceUrl] : [])),
  ]);

  // Shortest fields first: an excerpt that is the whole product name belongs to the product name.
  const fields = { productName: input.productName, headline: input.headline, body: input.bodyCopy } as const;

  const findings = drafts.map((draft): Finding => {
    const precedents = draft.precedents.map((p): Precedent => {
      const incident = p.incidentId ? byId.get(p.incidentId) : undefined;
      if (incident) {
        return {
          ...p,
          kind: "incident",
          brand: incident.brand,
          year: incident.year,
          sourceUrl: incident.sourceUrl,
          incidentId: incident.id,
        };
      }
      const { incidentId: _unknownId, sourceUrl, ...rest } = p;
      void _unknownId;
      return sourceUrl && knownUrls.has(sourceUrl) ? { ...rest, sourceUrl } : rest;
    });

    const reasoningOnly = precedents.every((p) => p.kind === "reasoning");
    const markets = draft.markets.filter((m) => input.markets.includes(m));

    let locus = draft.locus;
    if (locus.kind === "copy") {
      const excerpt = locus.excerpt.toLowerCase();
      if (!fields[locus.field].toLowerCase().includes(excerpt)) {
        const home = (Object.keys(fields) as (keyof typeof fields)[]).find((f) => fields[f].toLowerCase().includes(excerpt));
        if (home) locus = { ...locus, field: home };
      }
    }

    return {
      ...draft,
      id: makeId(),
      locus,
      markets: markets.length > 0 ? markets : [...input.markets],
      precedents,
      confidence: reasoningOnly ? Math.min(draft.confidence, REASONING_CONFIDENCE_CAP) : draft.confidence,
    };
  });

  return sortFindings(findings);
}

export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.confidence - a.confidence,
  );
}

export async function analyzeCampaign(input: CampaignInput, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const started = Date.now();
  const createMessage = options.createMessage ?? defaultCreateMessage;
  const loadImage = options.loadImage ?? defaultLoadImage;
  const corpus = options.corpus ?? INCIDENTS;
  const id = options.id ?? nanoid(12);
  const emit = options.onStage ?? (() => {});

  const ranked = rankIncidents(input, 12, { excludeIds: options.excludeIncidentIds, corpus });
  const incidents = ranked.map((r) => r.incident);
  emit({
    stage: "retrieval",
    incidents: ranked.map((r) => ({
      id: r.incident.id,
      brand: r.incident.brand,
      title: r.incident.title,
      year: r.incident.year,
      region: r.incident.region,
      matchedSignals: r.matchedSignals,
    })),
  });

  const calendarHits = checkCalendar(input.launchDate, input.markets);
  emit({ stage: "calendar", launchDate: input.launchDate ?? null, hits: calendarHits });

  emit({ stage: "creative" });
  let image: VisionImage;
  try {
    image = await loadImage(input.imageUrl);
  } catch (err) {
    const message = err instanceof CreativeError ? err.message : "The creative could not be loaded.";
    throw new AnalysisError("image_unavailable", message, { cause: err });
  }

  const messages: CreateMessageParams["messages"] = [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
        { type: "text", text: buildCampaignBrief(input, incidents, calendarHits) },
      ],
    },
  ];

  let submission: ReviewSubmission | null = null;
  let lastReason = "";
  let servedModel: string = ANALYST_MODEL;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !submission; attempt++) {
    emit({ stage: "model", model: ANALYST_MODEL, attempt });
    let message: ModelMessage;
    try {
      message = await createMessage({
        model: ANALYST_MODEL,
        max_tokens: 16_000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: [{ type: "text", text: ANALYST_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: [{ name: REVIEW_TOOL_NAME, description: REVIEW_TOOL_DESCRIPTION, input_schema: reviewToolInputSchema() }],
        tool_choice: { type: "auto" },
        messages,
      });
    } catch (err) {
      const mapped = err instanceof AnthropicClientError ? mapClientError(err) : new AnalysisError("upstream_unavailable", "The analysis failed unexpectedly.", { cause: err });
      log.error("analysis.failed", { analysisId: id, code: mapped.code, attempt, markets: input.markets, latencyMs: Date.now() - started });
      throw mapped;
    }

    if (message.stop_reason === "refusal") {
      log.warn("analysis.failed", { analysisId: id, code: "refused", category: message.stop_details?.category ?? null });
      throw new AnalysisError(
        "refused",
        "The model declined to review this submission. If this is genuine ad creative, try rephrasing the brand notes.",
      );
    }

    const outcome = readAttempt(message);
    if (outcome.ok) {
      submission = outcome.submission;
      // With server-side fallbacks, the model that actually served the review may differ.
      servedModel = message.model;
    } else {
      lastReason = outcome.reason;
      log.warn("analysis.retry", { analysisId: id, attempt, reason: outcome.reason });
      messages.push({ role: "assistant", content: message.content }, outcome.feedback);
    }
  }

  if (!submission) {
    log.error("analysis.failed", { analysisId: id, code: "invalid_output", reason: lastReason, latencyMs: Date.now() - started });
    throw new AnalysisError("invalid_output", "The analysis came back malformed twice. Try again.");
  }

  if (!submission.isAdvertisingCreative) {
    log.warn("request.rejected", { analysisId: id, reason: "not_ad_creative" });
    throw new AnalysisError(
      "not_ad_creative",
      "This doesn't look like advertising creative. Second Look reviews campaigns — upload the ad itself.",
    );
  }

  emit({ stage: "validating" });
  const findings = groundFindings(submission.findings, input, corpus, calendarHits);

  const result = AnalysisResultSchema.parse({
    id,
    input,
    findings,
    marketsAnalyzed: [...input.markets],
    corpusHits: incidents.map((i) => i.id),
    calendarHits,
    reviewNotes: submission.reviewNotes,
    analyzedAt: (options.now?.() ?? new Date()).toISOString(),
    modelUsed: servedModel,
  });

  log.info("analysis.completed", {
    analysisId: id,
    markets: input.markets,
    findings: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    corpusHits: incidents.length,
    calendarHits: calendarHits.length,
    latencyMs: Date.now() - started,
  });

  return result;
}
