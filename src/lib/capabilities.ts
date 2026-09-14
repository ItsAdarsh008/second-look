import "server-only";
import { INCIDENTS } from "@/data/incidents";
import type { IncidentSummary } from "@/components/report/report";

/** What this deployment can do. Booleans only — never pass secrets to the client. */
export function capabilities() {
  return {
    uploadMode: process.env.BLOB_READ_WRITE_TOKEN ? ("blob" as const) : ("local" as const),
    analysisAvailable: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
    generationAvailable: Boolean(process.env.MAGIC_HOUR_API_KEY),
  };
}

export function incidentSummaries(): IncidentSummary[] {
  return INCIDENTS.map(({ id, brand, title, year, region, sourceUrl }) => ({ id, brand, title, year, region, sourceUrl }));
}
