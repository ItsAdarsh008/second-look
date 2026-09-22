import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CASES, getCase } from "@/data/cases";
import { creativeUrl } from "@/data/cases/creative";
import { getCaseResult } from "@/data/cases/results";
import { BeforeAfter } from "@/components/generate/before-after";
import { PoweredByMagicHour } from "@/components/generate/powered-by-magic-hour";
import { IncidentPhotos } from "@/components/incident-photo";
import { Reveal, RiseLines } from "@/components/motion/primitives";
import { SeverityTag } from "@/components/report/finding-card";
import { Report } from "@/components/report/report";
import { incidentSummaries } from "@/lib/capabilities";
import { scoreCase } from "@/lib/eval";
import { formatDate } from "@/lib/format";
import { CASE_GROUPS, CATEGORY_LABEL, KIND_LABEL, SEVERITY_LABEL } from "@/lib/report";
import { CHANNEL_LABELS, marketName, type CaseFixture } from "@/lib/schema";

export function generateStaticParams() {
  return CASES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCase((await params).slug);
  if (!c) return { title: "Case not found" };
  return { title: `${c.title}, ${c.subtitle}`, description: c.dek };
}

const WHERE = { image: "In the image", copy: "In the copy", timing: "In the launch date", concept: "In the idea" } as const;

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "NBC News — Headline" → "Headline" (the hostname is shown beside it); short remainders keep the full label. */
function sourceTitle(label: string): string {
  const [, ...rest] = label.split(" — ");
  const remainder = rest.join(" — ");
  return remainder.length >= 20 ? remainder : label;
}

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <Reveal as="section" delay={delay} className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-rule py-9 first:border-t-0 first:pt-0 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10">
      <h2 className="font-serif text-[1.55rem] leading-tight text-ink">{title}</h2>
      <div className="min-w-0">{children}</div>
    </Reveal>
  );
}

function Neighbour({ c, direction }: { c: CaseFixture; direction: "Previous" | "Next" }) {
  return (
    <Link
      href={`/cases/${c.slug}`}
      className={`group flex items-center gap-4 rounded-[10px] border border-rule bg-sheet p-4 transition-colors hover:border-ink ${direction === "Next" ? "sm:flex-row-reverse sm:text-right" : ""}`}
    >
      <span className="w-14 shrink-0 overflow-hidden rounded-[3px] border border-rule">
        <Image src={creativeUrl(c.slug, "thumb")} alt="" width={540} height={675} sizes="56px" className="w-full transition-transform duration-500 group-hover:scale-110" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.82rem] text-ink-3">{direction} case</span>
        <span className="block truncate font-serif text-[1.45rem] leading-tight">{c.title}</span>
        <span className="block truncate text-[0.85rem] text-ink-3">{c.subtitle}</span>
      </span>
    </Link>
  );
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCase((await params).slug);
  if (!c) notFound();
  const result = getCaseResult(c.slug);
  const score = result ? scoreCase(c, result.analysis.findings) : null;
  const { input } = c;
  const index = CASES.findIndex((x) => x.slug === c.slug);
  const previous = CASES[(index - 1 + CASES.length) % CASES.length];
  const next = CASES[(index + 1) % CASES.length];
  const group = CASE_GROUPS.find((g) => g.kind === c.kind);

  const facts = [
    { label: "Markets", value: input.markets.map(marketName).join(", ") },
    { label: "Launch", value: input.launchDate ? formatDate(input.launchDate) : "No date set" },
    { label: "Channel", value: CHANNEL_LABELS[input.channel] },
    { label: "Brand", value: input.brandName ?? "None given" },
    { label: "Tests", value: group?.title ?? KIND_LABEL[c.kind] },
  ];

  return (
    <article className="mx-auto max-w-[88rem] px-5 pt-10 sm:px-8">
      <nav aria-label="Breadcrumb" className="text-[0.9rem] text-ink-3">
        <Link href="/cases" className="underline decoration-rule-strong underline-offset-4 hover:text-ink">
          Case studies
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        {KIND_LABEL[c.kind]}
      </nav>

      <header className="mt-6 grid grid-cols-[minmax(0,1fr)] items-end gap-10 border-b border-rule pb-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h1 className="font-serif text-[3.6rem] leading-[0.92] tracking-tight sm:text-[5.6rem]">
            <RiseLines lines={[c.title]} />
          </h1>
          <p className="fade-up mt-3 font-serif text-[1.6rem] leading-tight text-ink-2 sm:text-[2rem]" style={{ animationDelay: "120ms" }}>
            {c.subtitle}
          </p>
          <p className="fade-up mt-5 max-w-[56ch] text-[1.08rem] leading-relaxed text-ink-2" style={{ animationDelay: "200ms" }}>
            {c.dek}
          </p>
        </div>
        <dl className="fade-up grid grid-cols-2 gap-x-6 gap-y-4 rounded-[10px] border border-rule bg-sheet p-5 text-[0.95rem]" style={{ animationDelay: "260ms" }}>
          {facts.map((f) => (
            <div key={f.label} className={f.label === "Markets" || f.label === "Tests" ? "col-span-2" : ""}>
              <dt className="text-[0.82rem] text-ink-3">{f.label}</dt>
              <dd className="mt-0.5 text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-16">
        <aside className="fade-up" style={{ animationDelay: "300ms" }}>
          <div className="lg:sticky lg:top-6">
            <div className="light-table rounded-[10px] p-4">
              <Image src={input.imageUrl} alt={`Synthetic creative for ${c.title}`} width={1080} height={1350} priority className="w-full rounded-[2px]" sizes="(min-width: 1024px) 320px, 100vw" />
              <p className="mt-3 text-[0.82rem] text-[var(--table-dim)]">Synthetic creative with a fictional brand, made for this project.</p>
            </div>
            <details className="mt-3 text-[0.9rem] text-ink-2">
              <summary className="cursor-pointer text-ink-3 hover:text-ink">Why the creative is synthetic</summary>
              <p className="mt-2 leading-relaxed">{c.creativeNote}</p>
            </details>
            <Link href={`/?case=${c.slug}`} className="mt-5 flex items-center justify-center rounded-[6px] bg-ink px-5 py-3 text-paper transition-colors hover:bg-pencil">
              Open this case in the tool
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <Section title="The campaign">
            <dl className="space-y-4">
              <div>
                <dt className="text-[0.82rem] text-ink-3">Product name</dt>
                <dd className="text-[1.15rem] text-ink">{input.productName}</dd>
              </div>
              <div>
                <dt className="text-[0.82rem] text-ink-3">Headline</dt>
                <dd className="font-serif text-[2rem] leading-[1.15] text-ink">{input.headline}</dd>
              </div>
              <div>
                <dt className="text-[0.82rem] text-ink-3">Body copy</dt>
                <dd className="max-w-[60ch] text-[1.05rem] leading-relaxed text-ink">{input.bodyCopy}</dd>
              </div>
            </dl>
          </Section>

          <Section title="What a reviewer must catch" delay={0.05}>
            {c.expected.length === 0 ? (
              <div className="max-w-[60ch]">
                <p className="font-serif text-[1.7rem] leading-tight text-ink">Nothing.</p>
                <p className="mt-2 leading-relaxed text-ink-2">
                  This is an ordinary campaign for a market where other cases do carry risk. A tool that flags it is producing noise, and false
                  positives are what make reviewers stop reading.
                </p>
                {result && (
                  <p className={`mt-3 font-medium ${result.analysis.findings.length === 0 ? "text-ink" : "text-critical"}`}>
                    {result.analysis.findings.length === 0 ? "Second Look came back clean." : `Second Look raised ${result.analysis.findings.length}.`}
                  </p>
                )}
              </div>
            ) : (
              <ol className="space-y-3">
                {c.expected.map((e, i) => {
                  const outcome = score?.expected[i];
                  return (
                    <li key={e.description} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-[8px] border border-rule bg-sheet p-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-ink text-[0.85rem] font-semibold">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[1.05rem] leading-snug text-ink">{e.description}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.85rem] text-ink-3">
                          <span>{WHERE[e.locusKind]}</span>
                          <span>{CATEGORY_LABEL[e.categories[0]]}</span>
                          <span className="flex items-center gap-1.5">
                            at least <SeverityTag severity={e.minSeverity} />
                          </span>
                        </p>
                        {outcome && (
                          <p className={`mt-2 text-[0.9rem] font-medium ${outcome.hit ? "text-ink" : "text-critical"}`}>
                            {outcome.hit
                              ? `Caught, rated ${SEVERITY_LABEL[outcome.matchedSeverity ?? e.minSeverity].toLowerCase()}${outcome.severityMet ? "" : ", below the expected severity"}`
                              : "Missed"}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>

          {c.history && (
            <Section title="What actually happened" delay={0.05}>
              <p className="max-w-[64ch] text-[1.05rem] leading-relaxed text-ink-2">{c.history.whatHappened}</p>
              {c.history.photos && c.history.photos.length > 0 && (
                <div className="mt-7">
                  <IncidentPhotos photos={c.history.photos} />
                </div>
              )}
              <ul className="mt-7 divide-y divide-rule border-y border-rule">
                {c.history.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="group flex items-baseline justify-between gap-4 py-2.5 text-[0.93rem]">
                      <span className="text-ink underline decoration-rule-strong underline-offset-4 group-hover:decoration-ink">{sourceTitle(s.label)}</span>
                      <span className="shrink-0 text-ink-3">{hostname(s.url)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {!result && (
            <Section title="The analysis" delay={0.05}>
              <p className="max-w-[60ch] leading-relaxed text-ink-2">
                Not published yet. Gallery results are computed once and saved, so reading a case never spends API calls. Open it in the tool to run
                it live.
              </p>
            </Section>
          )}
        </div>
      </div>

      {result?.generation && (
        <section
          aria-labelledby="alternative"
          className="mt-16 overflow-hidden rounded-[10px] border-2 border-pencil/35 bg-pencil-wash/45"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-pencil/25 px-5 py-4 sm:px-7">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-pencil">Generated creative</p>
              <h2 id="alternative" className="mt-1.5 font-serif text-[1.9rem] leading-none sm:text-[2.2rem]">
                An alternative to consider
              </h2>
            </div>
            <PoweredByMagicHour className="border-pencil/30" />
          </div>
          <div className="px-5 py-5 sm:px-7 sm:py-6">
            <p className="max-w-[72ch] text-[1.02rem] text-ink-2">
              Drafted by the{" "}
              <a href="https://docs.magichour.ai" className="font-medium text-pencil underline underline-offset-2">
                Magic Hour API
              </a>{" "}
              from the findings below, including wording lettered into the artwork.{" "}
              <strong className="font-medium text-ink">It does not rename the product or move the launch date</strong> — those findings stand.
            </p>
            <p className="mt-2 font-mono text-[0.8rem] text-ink-3">
              model {result.generation.model} · {result.generation.creditsCharged} credits · one request, shown in full
            </p>
            {/*
              The creative is portrait, so the image column's width sets the panel's height: at
              38rem the slider alone ran past a laptop viewport and the ad couldn't be seen whole.
              22rem keeps it inside one screen, and the payload is capped and scrolled rather than
              allowed to stretch the row.
            */}
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
              <BeforeAfter before={input.imageUrl} after={result.generation.images[0]} />
              <div className="code-plate self-start overflow-hidden rounded-[6px]">
                <p className="border-b border-[var(--plate-rule)] px-5 py-2.5 font-mono text-[0.82rem] text-[var(--plate-dim)]">POST https://api.magichour.ai/v1/ai-image-editor</p>
                <pre className="max-h-[26rem] overflow-auto whitespace-pre-wrap px-5 py-4 font-mono text-[0.78rem] leading-relaxed [overflow-wrap:anywhere]">
                  {JSON.stringify(result.generation.requestBody, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </section>
      )}

      {result && (
        <section aria-label="What Second Look found" className="mt-16 border-t-2 border-ink pt-10">
          <Report result={result.analysis} incidents={incidentSummaries()} share={false} />
          {result.leaveOneOut && c.ownIncidentIds.length > 0 && (
            <p className="mt-4 text-sm text-ink-3">This run left the incident itself out of the reference material, so the analyzer had to find the risk unaided.</p>
          )}
        </section>
      )}

      <nav aria-label="More cases" className="mt-20 grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-rule pt-8 sm:grid-cols-2">
        <Neighbour c={previous} direction="Previous" />
        <Neighbour c={next} direction="Next" />
      </nav>
    </article>
  );
}
