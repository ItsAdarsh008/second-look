import { z } from "zod";
import { AnalysisResultSchema, ApiErrorBodySchema, CalendarHitSchema } from "./schema";

/** Events streamed by POST /api/analyze with `Accept: application/x-ndjson`. Shared by server and browser. */
export const AnalyzeStreamEventSchema = z.discriminatedUnion("stage", [
  z.object({
    stage: z.literal("retrieval"),
    incidents: z.array(
      z.object({
        id: z.string(),
        brand: z.string(),
        title: z.string(),
        year: z.number(),
        region: z.string(),
        matchedSignals: z.array(z.string()),
      }),
    ),
  }),
  z.object({ stage: z.literal("calendar"), launchDate: z.string().nullable(), hits: z.array(CalendarHitSchema) }),
  z.object({ stage: z.literal("creative") }),
  z.object({ stage: z.literal("model"), model: z.string(), attempt: z.number() }),
  z.object({ stage: z.literal("validating") }),
  z.object({ stage: z.literal("complete"), result: AnalysisResultSchema }),
  z.object({ stage: z.literal("error") }).extend(ApiErrorBodySchema.shape),
]);
export type AnalyzeStreamEvent = z.infer<typeof AnalyzeStreamEventSchema>;
