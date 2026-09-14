import { OG_SIZE, renderReportCard } from "@/lib/og";
import { AnalysisResultSchema } from "@/lib/schema";
import { getStore, keys } from "@/lib/store";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Second Look report";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? await getStore().getJSON(keys.analysis(id), AnalysisResultSchema) : null;
  return renderReportCard({
    imageUrl: analysis?.input.imageUrl ?? "/cases/starbucks-korea.png",
    title: analysis ? analysis.input.productName || analysis.input.headline || "A campaign" : "Report not found",
    findings: analysis?.findings ?? null,
    kicker: "Second Look report",
  });
}
