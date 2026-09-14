import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CASES } from "@/data/cases";
import { getCaseResult } from "@/data/cases/results";
import { Reveal, RiseLines } from "@/components/motion/primitives";
import { scoreCase } from "@/lib/eval";
import { CASE_GROUPS, CATEGORY_LABEL, KIND_LABEL, expectationSummary } from "@/lib/report";
import { marketName, type CaseFixture } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Case studies",
  description:
    "Real campaign failures rebuilt with fictional brands, risks planted in the picture or the words, and clean controls, each run through Second Look.",
};

/** What the card promises, or what the published run actually did. */
function Outcome({ c }: { c: CaseFixture }) {
  const result = getCaseResult(c.slug);
  if (!result) return <span className="text-ink-3">{expectationSummary(c)}</span>;
  const findings = result.analysis.findings;
  if (c.kind === "control") {
    return findings.length === 0 ? (
      <span className="font-medium text-ink">Came back clean</span>
    ) : (
      <span className="font-medium text-critical">
        {findings.length} false {findings.length === 1 ? "positive" : "positives"}
      </span>
    );
  }
  const score = scoreCase(c, findings);
  return (
    <span className={`font-medium ${score.misses === 0 ? "text-ink" : "text-critical"}`}>
      Caught {score.hits} of {c.expected.length}
    </span>
  );
}

/** Stacked: image on top, for the card sitting beside the featured case. */
function StackedCaseCard({ c }: { c: CaseFixture }) {
  return (
    <li className="fade-up h-full" style={{ animationDelay: "320ms" }}>
      <Link href={`/cases/${c.slug}`} className="group flex h-full flex-col rounded-[10px] border border-rule bg-sheet p-4 transition-colors duration-300 hover:border-ink">
        <div className="overflow-hidden rounded-[4px] border border-rule">
          <Image
            src={`/cases/${c.slug}.png`}
            alt=""
            width={1080}
            height={1350}
            sizes="(min-width: 1024px) 400px, 100vw"
            className="aspect-[4/3] w-full object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        </div>
        <h3 className="mt-4 font-serif text-[1.9rem] leading-[1.05]">{c.title}</h3>
        <p className="mt-1 text-[0.88rem] text-ink-3">{c.subtitle}</p>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{c.dek}</p>
        <p className="mt-auto pt-4 text-[0.88rem]">
          <Outcome c={c} />
        </p>
      </Link>
    </li>
  );
}

function CaseCard({ c, delay }: { c: CaseFixture; delay: number }) {
  return (
    <Reveal as="li" delay={delay} className="h-full">
      <Link
        href={`/cases/${c.slug}`}
        className="group grid h-full grid-cols-[6.5rem_minmax(0,1fr)] gap-5 rounded-[10px] border border-rule bg-sheet p-4 transition-colors duration-300 hover:border-ink sm:grid-cols-[8.5rem_minmax(0,1fr)]"
      >
        <div className="self-start overflow-hidden rounded-[4px] border border-rule">
          <Image
            src={`/cases/${c.slug}-thumb.png`}
            alt=""
            width={540}
            height={675}
            sizes="120px"
            className="w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <h3 className="font-serif text-[1.65rem] leading-[1.05]">{c.title}</h3>
          <p className="mt-1 text-[0.88rem] text-ink-3">{c.subtitle}</p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{c.dek}</p>
          <p className="mt-auto pt-4 text-[0.88rem]">
            <Outcome c={c} />
          </p>
        </div>
      </Link>
    </Reveal>
  );
}

function FeaturedCase({ c }: { c: CaseFixture }) {
  return (
    <li className="lg:col-span-2">
      <Link
        href={`/cases/${c.slug}`}
        className="group fade-up grid h-full grid-cols-[minmax(0,1fr)] gap-6 rounded-[10px] border border-ink bg-sheet p-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8 sm:p-6"
        style={{ animationDelay: "240ms" }}
      >
        <div className="light-table self-start rounded-[8px] p-3">
          <div className="overflow-hidden rounded-[2px]">
            <Image
              src={`/cases/${c.slug}.png`}
              alt=""
              width={1080}
              height={1350}
              priority
              sizes="(min-width: 640px) 208px, 100vw"
              className="w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="text-[0.88rem] text-pencil">The case that started this</p>
          <h3 className="mt-1 font-serif text-[2.6rem] leading-[1] sm:text-[3.2rem]">{c.title}</h3>
          <p className="mt-2 text-ink-3">{c.subtitle}</p>
          <p className="mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-ink-2">{c.dek}</p>
          <ol className="mt-5 space-y-2 border-t border-rule pt-4 text-[0.93rem]">
            {c.expected.map((e, i) => (
              <li key={e.description} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2">
                <span className="font-semibold text-pencil">{i + 1}</span>
                <span className="text-ink">
                  {e.description}
                  <span className="text-ink-3"> ({CATEGORY_LABEL[e.categories[0]].toLowerCase()})</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-auto pt-5 text-[0.9rem] underline decoration-rule-strong underline-offset-4 transition-colors group-hover:decoration-ink">
            Read the case
          </p>
        </div>
      </Link>
    </li>
  );
}

export default function CasesPage() {
  const [featured] = CASES;
  const published = CASES.some((c) => getCaseResult(c.slug));
  const counts = {
    real: CASES.filter((c) => c.kind === "incident-reconstruction").length,
    planted: CASES.filter((c) => c.kind === "synthetic-visual" || c.kind === "synthetic-language").length,
    controls: CASES.filter((c) => c.kind === "control").length,
  };

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-12 sm:px-8">
      <header className="grid grid-cols-[minmax(0,1fr)] items-end gap-8 border-b border-rule pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h1 className="font-serif text-[3.4rem] leading-[0.95] tracking-tight sm:text-[5rem]">
            <RiseLines lines={["Case studies"]} />
          </h1>
          <p className="fade-up mt-5 max-w-[52ch] text-[1.08rem] leading-relaxed text-ink-2" style={{ animationDelay: "150ms" }}>
            The test set behind Second Look. Each case is a complete campaign with an answer key, run through the same analyzer as the live tool.
            Real incidents are left out of the reference material while they&rsquo;re tested, so it can&rsquo;t look up the answer.
          </p>
        </div>
        <dl className="fade-up grid grid-cols-3 gap-4 lg:justify-self-end" style={{ animationDelay: "220ms" }}>
          {[
            { n: counts.real, label: "real failures" },
            { n: counts.planted, label: "planted risks" },
            { n: counts.controls, label: "controls" },
          ].map((s) => (
            <div key={s.label} className="border-l border-rule pl-4">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-[2.6rem] font-medium leading-none tabular-nums">{s.n}</dd>
              <dd className="mt-1 text-[0.9rem] text-ink-3">{s.label}</dd>
            </div>
          ))}
        </dl>
      </header>

      {!published && (
        <p className="fade-up mt-6 text-[0.92rem] text-ink-3" style={{ animationDelay: "280ms" }}>
          Results appear on each card once the gallery has been run. Until then, every case can be opened in the tool and run live. All creative is
          synthetic, made for this project with fictional brands.
        </p>
      )}

      <div className="mt-14 space-y-20">
        {CASE_GROUPS.map((group) => {
          const cases = CASES.filter((c) => c.kind === group.kind);
          if (cases.length === 0) return null;
          return (
            <section key={group.kind} aria-labelledby={`group-${group.kind}`}>
              <Reveal className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b border-rule pb-4">
                <div>
                  <h2 id={`group-${group.kind}`} className="font-serif text-[2.2rem] leading-tight sm:text-[2.6rem]">
                    {group.title}
                  </h2>
                  <p className="mt-1 max-w-[60ch] text-ink-2">{group.description}</p>
                </div>
                <p className="text-[0.9rem] text-ink-3">
                  {cases.length} {cases.length === 1 ? "case" : "cases"}
                </p>
              </Reveal>
              <ul
                className={`mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 ${
                  cases.length === 2 && !cases.some((c) => c.slug === featured.slug) ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {cases.map((c, i) => {
                  if (c.slug === featured.slug) return <FeaturedCase key={c.slug} c={c} />;
                  if (cases.some((x) => x.slug === featured.slug)) return <StackedCaseCard key={c.slug} c={c} />;
                  return <CaseCard key={c.slug} c={c} delay={Math.min(i, 3) * 0.07} />;
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-16 text-[0.92rem] text-ink-3">
        Markets covered by these cases: {[...new Set(CASES.flatMap((c) => c.input.markets))].map(marketName).join(", ")}. {KIND_LABEL.control}s use the
        same markets as the risky cases, so a clean result means something.
      </p>
    </div>
  );
}
