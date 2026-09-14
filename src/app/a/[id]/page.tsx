import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GeneratePanel } from "@/components/generate/generate-panel";
import { Report } from "@/components/report/report";
import { capabilities, incidentSummaries } from "@/lib/capabilities";
import { severityCounts, verdictLine } from "@/lib/report";
import { AnalysisResultSchema, marketName } from "@/lib/schema";
import { getStore, keys } from "@/lib/store";

export const dynamic = "force-dynamic";

async function load(id: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  return getStore().getJSON(keys.analysis(id), AnalysisResultSchema);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const analysis = await load((await params).id);
  if (!analysis) return { title: "Report not found" };
  const c = severityCounts(analysis.findings);
  const subject = analysis.input.productName || analysis.input.headline || "Campaign";
  return {
    title: `${subject}: ${analysis.findings.length} ${analysis.findings.length === 1 ? "finding" : "findings"}`,
    description: `${verdictLine(analysis.findings)} Markets: ${analysis.marketsAnalyzed.map(marketName).join(", ")}. ${c.critical} critical, ${c.high} high.`,
  };
}

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const analysis = await load((await params).id);
  if (!analysis) notFound();
  const caps = capabilities();

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 sm:px-8">
      <p className="mb-8 text-sm text-ink-3">
        A shared Second Look report.{" "}
        <Link href="/" className="text-pencil underline underline-offset-2">
          Review your own campaign
        </Link>
      </p>
      <Report result={analysis} incidents={incidentSummaries()} />
      {analysis.findings.length > 0 && <GeneratePanel analysis={analysis} enabled={caps.generationAvailable} />}
    </div>
  );
}
