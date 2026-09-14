import { CASES, getCase } from "@/data/cases";
import { getCaseResult } from "@/data/cases/results";
import { OG_SIZE, renderReportCard } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Second Look case study";

export function generateStaticParams() {
  return CASES.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCase(slug);
  const result = c ? getCaseResult(c.slug) : null;
  return renderReportCard({
    imageUrl: c?.input.imageUrl ?? "/cases/starbucks-korea.png",
    title: c?.title ?? "Case study",
    findings: result?.analysis.findings ?? null,
    kicker: c ? `Case study: ${c.subtitle}` : "Second Look case study",
  });
}
