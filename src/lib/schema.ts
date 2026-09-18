import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Markets                                                             */
/* ------------------------------------------------------------------ */

export const MARKETS = [
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "US", name: "United States" },
  { code: "MX", name: "Mexico" },
  { code: "NG", name: "Nigeria" },
  { code: "JP", name: "Japan" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "BR", name: "Brazil" },
  { code: "ID", name: "Indonesia" },
  { code: "TR", name: "Türkiye" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
] as const;

export type MarketInfo = (typeof MARKETS)[number];
export const MARKET_CODES = MARKETS.map((m) => m.code) as [MarketInfo["code"], ...MarketInfo["code"][]];

/** A market is identified by its ISO 3166-1 alpha-2 code. Display names come from `MARKETS`. */
export const MarketSchema = z.enum(MARKET_CODES);
export type Market = z.infer<typeof MarketSchema>;

export function marketName(code: Market): string {
  return MARKETS.find((m) => m.code === code)?.name ?? code;
}

/* ------------------------------------------------------------------ */
/* Campaign input                                                      */
/* ------------------------------------------------------------------ */

export const CHANNELS = ["ooh", "social", "tv", "print", "in-store", "digital-display"] as const;
export const ChannelSchema = z.enum(CHANNELS);
export type Channel = z.infer<typeof ChannelSchema>;

export const CHANNEL_LABELS: Record<Channel, string> = {
  ooh: "Out of home",
  social: "Social",
  tv: "TV",
  print: "Print",
  "in-store": "In-store",
  "digital-display": "Digital display",
};

/** ISO calendar date, YYYY-MM-DD, validated as a real date. */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD)")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Not a real calendar date");

/**
 * Where the creative lives. Either an absolute https URL (Vercel Blob) or a
 * root-relative path served by this app (`/cases/...`, `/api/uploads/...`).
 */
export const ImageUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((s) => s.startsWith("/") || /^https:\/\//.test(s), "Image must be an https URL or an app-relative path");

export const CampaignInputSchema = z.object({
  imageUrl: ImageUrlSchema,
  /** Magic Hour `file_path` once the creative has been uploaded there. */
  imageFilePath: z.string().min(1).nullable(),
  brandName: z.string().trim().max(80).optional(),
  headline: z.string().trim().max(300),
  bodyCopy: z.string().trim().max(2000),
  productName: z.string().trim().max(120),
  markets: z.array(MarketSchema).min(1, "Pick at least one market").max(6),
  launchDate: IsoDateSchema.optional(),
  channel: ChannelSchema,
  brandNotes: z.string().trim().max(1000).optional(),
});
export type CampaignInput = z.infer<typeof CampaignInputSchema>;

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

export const RISK_CATEGORIES = [
  "historical-memory",
  "religious",
  "political",
  "racial-ethnic",
  "gender-sexuality",
  "caste-class",
  "language-translation",
  "gesture-symbol",
  "color-symbolism",
  "numerology",
  "food-dietary",
  "national-symbol",
  "calendar-timing",
  "body-appearance",
] as const;
export const RiskCategorySchema = z.enum(RISK_CATEGORIES);
export type RiskCategory = z.infer<typeof RiskCategorySchema>;

export const SEVERITIES = ["critical", "high", "moderate", "low"] as const;
export const SeveritySchema = z.enum(SEVERITIES);
export type Severity = z.infer<typeof SeveritySchema>;

/** Lower rank = more severe. */
export const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

const Unit = z.number().min(0).max(1);

export const LocusSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    /** [x, y, width, height], each normalized 0–1 relative to the image. */
    bbox: z.tuple([Unit, Unit, Unit, Unit]),
    description: z.string().min(1).max(300),
  }),
  z.object({
    kind: z.literal("copy"),
    field: z.enum(["headline", "body", "productName"]),
    excerpt: z.string().min(1).max(300),
  }),
  z.object({
    kind: z.literal("timing"),
    date: IsoDateSchema,
    reason: z.string().min(1).max(300),
  }),
  z.object({
    kind: z.literal("concept"),
    description: z.string().min(1).max(300),
  }),
]);
export type Locus = z.infer<typeof LocusSchema>;
export type LocusKind = Locus["kind"];

/**
 * Grounding for a finding.
 * - `incident`: a documented brand/advertising failure.
 * - `referent`: the documented historical event, symbol or usage the element evokes.
 * - `reasoning`: no citable case; the rationale is stated explicitly and confidence must be lowered.
 */
export const PrecedentSchema = z
  .object({
    kind: z.enum(["incident", "referent", "reasoning"]),
    title: z.string().min(1).max(140),
    brand: z.string().min(1).max(80).nullable(),
    year: z.number().int().min(1000).max(2100).nullable(),
    market: z.string().min(1).max(80),
    summary: z.string().min(1).max(600),
    outcome: z.string().max(400).nullable(),
    sourceUrl: z.string().url().optional(),
    /** Corpus id when the precedent was drawn from the incident corpus. */
    incidentId: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.kind === "incident" && (p.brand === null || p.year === null)) {
      ctx.addIssue({ code: "custom", message: "An incident precedent must name the brand and year" });
    }
  });
export type Precedent = z.infer<typeof PrecedentSchema>;

/** Everything the model produces for a finding. The server assigns `id`. */
export const FindingDraftSchema = z.object({
  severity: SeveritySchema,
  category: RiskCategorySchema,
  markets: z.array(MarketSchema).min(1),
  locus: LocusSchema,
  claim: z.string().min(10).max(200),
  rationale: z.string().min(20).max(1200),
  precedents: z.array(PrecedentSchema).min(1, "A finding with no grounding is a bug"),
  confidence: Unit,
  fixDirective: z.string().min(5).max(400),
});
export type FindingDraft = z.infer<typeof FindingDraftSchema>;

export const FindingSchema = FindingDraftSchema.extend({
  id: z.string().min(1),
});
export type Finding = z.infer<typeof FindingSchema>;

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

export const GRAVITIES = ["solemn", "contested", "celebratory", "religious-observance"] as const;
export const GravitySchema = z.enum(GRAVITIES);
export type Gravity = z.infer<typeof GravitySchema>;

const MonthDay = z
  .string()
  .regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Expected MM-DD")
  // Checked against a leap year so 02-29 stays valid.
  .refine((md) => IsoDateSchema.safeParse(`2024-${md}`).success, "Not a real month and day");

export const DateRuleSchema = z.discriminatedUnion("type", [
  /** Same calendar day every year. */
  z.object({ type: z.literal("fixed"), date: MonthDay }),
  /** Same span every year, inclusive. May wrap the new year (e.g. 12-24 → 01-02). */
  z.object({ type: z.literal("range"), start: MonthDay, end: MonthDay }),
  /**
   * Moves year to year (lunar, lunisolar, moon-sighting, computed feasts).
   * `approximate` windows are planning estimates only; every match on a
   * variable entry is returned with `needsVerification: true`.
   */
  z.object({
    type: z.literal("variable"),
    note: z.string().min(1),
    approximate: z
      .array(
        z.object({ start: IsoDateSchema, end: IsoDateSchema }).refine((w) => w.start <= w.end, "Window must start before it ends"),
      )
      .min(1, "A variable entry needs at least one estimated window"),
  }),
]);
export type DateRule = z.infer<typeof DateRuleSchema>;

export const CalendarEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  market: MarketSchema,
  label: z.string().min(1),
  dateRule: DateRuleSchema,
  gravity: GravitySchema,
  guidance: z.string().min(1),
  sourceUrl: z.string().url().optional(),
});
export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;

export const CalendarHitSchema = z.object({
  entryId: z.string(),
  market: MarketSchema,
  label: z.string(),
  gravity: GravitySchema,
  guidance: z.string(),
  sourceUrl: z.string().url().optional(),
  /** Start and end (inclusive) of the occurrence nearest the launch date. */
  occurrence: z.object({ start: IsoDateSchema, end: IsoDateSchema }),
  /**
   * Days from the occurrence to the launch date: 0 when the launch falls inside
   * it, negative when the launch is before it, positive when after.
   * `null` for variable-date entries, whose occurrence is only an estimate.
   */
  daysOffset: z.number().int().nullable(),
  needsVerification: z.boolean(),
  note: z.string().optional(),
});
export type CalendarHit = z.infer<typeof CalendarHitSchema>;

/* ------------------------------------------------------------------ */
/* Incident corpus                                                     */
/* ------------------------------------------------------------------ */

export const IncidentSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  brand: z.string().min(1),
  /** Short name for the campaign or episode, e.g. "Tank Day". */
  title: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  /** Supported markets where it landed. May be empty when the market is outside the supported list. */
  markets: z.array(MarketSchema),
  /** Human-readable place, e.g. "South Korea", "New Zealand", "Global". */
  region: z.string().min(1),
  categories: z.array(RiskCategorySchema).min(1),
  whatHappened: z.string().min(1),
  whyItLanded: z.string().min(1),
  outcome: z.string().min(1),
  /** Searchable trigger terms, lowercase. */
  signals: z.array(z.string().min(1)).min(3),
  sourceUrl: z.string().url(),
});
export type Incident = z.infer<typeof IncidentSchema>;

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

export const AnalysisResultSchema = z.object({
  id: z.string().min(1),
  input: CampaignInputSchema,
  findings: z.array(FindingSchema),
  marketsAnalyzed: z.array(MarketSchema),
  /** Ids of corpus incidents supplied to the model as reference. */
  corpusHits: z.array(z.string()),
  calendarHits: z.array(CalendarHitSchema),
  /** What the model says it examined — rendered on the zero-findings state. */
  reviewNotes: z.string().max(1500),
  analyzedAt: z.string().datetime(),
  modelUsed: z.string(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/* ------------------------------------------------------------------ */
/* Magic Hour edit jobs                                                */
/* ------------------------------------------------------------------ */

export const MAGIC_HOUR_MODELS = ["default", "flux-2-klein", "gpt-image-2", "nano-banana-2"] as const;
export const MagicHourModelSchema = z.enum(MAGIC_HOUR_MODELS);
export type MagicHourModel = z.infer<typeof MagicHourModelSchema>;

export const MAGIC_HOUR_RESOLUTIONS = ["auto", "640px", "1k", "2k"] as const;
export const MagicHourResolutionSchema = z.enum(MAGIC_HOUR_RESOLUTIONS);
export type MagicHourResolution = z.infer<typeof MagicHourResolutionSchema>;

export const MAGIC_HOUR_ASPECT_RATIOS = ["auto", "16:9", "9:16", "4:3", "3:2", "1:1", "4:5", "2:3"] as const;
export const MagicHourAspectRatioSchema = z.enum(MAGIC_HOUR_ASPECT_RATIOS);
export type MagicHourAspectRatio = z.infer<typeof MagicHourAspectRatioSchema>;

export const EDIT_JOB_STATUSES = ["draft", "queued", "rendering", "complete", "error", "canceled"] as const;
export const EditJobStatusSchema = z.enum(EDIT_JOB_STATUSES);
export type EditJobStatus = z.infer<typeof EditJobStatusSchema>;

export const EditJobSchema = z.object({
  id: z.string().min(1),
  analysisId: z.string().min(1),
  magicHourProjectId: z.string().min(1),
  prompt: z.string().min(1),
  model: MagicHourModelSchema,
  resolution: MagicHourResolutionSchema,
  imageCount: z.union([z.literal(1), z.literal(4)]),
  /** Finding ids the prompt was compiled from. */
  findingIds: z.array(z.string()),
  /** The exact JSON body sent to POST /v1/ai-image-editor. */
  requestBody: z.record(z.string(), z.unknown()),
  status: EditJobStatusSchema,
  creditsCharged: z.number().int().nonnegative(),
  downloads: z.array(z.object({ url: z.string().url(), expiresAt: z.string() })),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Status transitions observed while polling, for the API panel. */
  pollLog: z.array(z.object({ at: z.string().datetime(), status: EditJobStatusSchema })),
});
export type EditJob = z.infer<typeof EditJobSchema>;

/* ------------------------------------------------------------------ */
/* Case fixtures (gallery + evals)                                     */
/* ------------------------------------------------------------------ */

export const ExpectedFindingSchema = z.object({
  /** Any of these categories counts as a hit. First is the canonical one. */
  categories: z.array(RiskCategorySchema).min(1),
  locusKind: z.enum(["image", "copy", "timing", "concept"]),
  minSeverity: SeveritySchema,
  /** What a competent reviewer must notice, in one line. */
  description: z.string().min(1),
});
export type ExpectedFinding = z.infer<typeof ExpectedFindingSchema>;

/**
 * A documentary photograph for a case's history. Freely licensed only (e.g. Wikimedia
 * Commons), credited the way the license asks. Never a news agency photo or a brand asset.
 */
export const HistoryPhotoSchema = z.object({
  /** App-relative path under /story/. */
  src: z.string().regex(/^\/story\/[a-z0-9-]+\.jpg$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1),
  /** What the photo shows, and why it belongs to the case. */
  caption: z.string().min(1),
  /** The word or date in the campaign this photo explains, e.g. "Tank". */
  refersTo: z.string().min(1),
  /** CSS object-position for the crop when the photo is shown in a fixed frame. */
  focus: z.string().optional(),
  credit: z.object({
    author: z.string().min(1),
    license: z.string().min(1),
    licenseUrl: z.string().url(),
    sourceUrl: z.string().url(),
  }),
});
export type HistoryPhoto = z.infer<typeof HistoryPhotoSchema>;

export const CaseFixtureSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  /** Short case name, e.g. "Tank Day". */
  title: z.string().min(1).max(40),
  /** Who and where, e.g. "Starbucks Korea, May 2026" or "Menswear for China". */
  subtitle: z.string().min(1).max(60),
  kind: z.enum(["incident-reconstruction", "synthetic-visual", "synthetic-language", "control"]),
  /** One-line dek for the gallery card. */
  dek: z.string().min(1),
  input: CampaignInputSchema,
  expected: z.array(ExpectedFindingSchema),
  /** Corpus incident ids that ARE this case — excluded from retrieval during evals (leave-one-out). */
  ownIncidentIds: z.array(z.string()),
  /** How the creative was made. Always synthetic; never a scraped brand asset. */
  creativeNote: z.string().min(1),
  /** Real-world account, for reconstructions of documented incidents. */
  history: z
    .object({
      whatHappened: z.string().min(1),
      sources: z.array(z.object({ label: z.string().min(1), url: z.string().url() })).min(1),
      photos: z.array(HistoryPhotoSchema).optional(),
    })
    .nullable(),
});
export type CaseFixture = z.infer<typeof CaseFixtureSchema>;

/** Pre-computed gallery result for a fixture. Written by `npm run cases:build`; never computed on page views. */
export const CaseResultSchema = z.object({
  slug: z.string(),
  computedAt: z.string().datetime(),
  /** True when the case's own incident was removed from the reference corpus for this run. */
  leaveOneOut: z.boolean(),
  analysis: AnalysisResultSchema,
  generation: z
    .object({
      model: MagicHourModelSchema,
      prompt: z.string(),
      requestBody: z.record(z.string(), z.unknown()),
      creditsCharged: z.number().int().nonnegative(),
      /** App-relative paths under /cases/generated/. */
      images: z.array(z.string()).min(1),
      findingIds: z.array(z.string()),
    })
    .nullable(),
});
export type CaseResult = z.infer<typeof CaseResultSchema>;

/* ------------------------------------------------------------------ */
/* API errors                                                          */
/* ------------------------------------------------------------------ */

export const ApiErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
