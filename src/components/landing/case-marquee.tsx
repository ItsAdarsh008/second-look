import Image from "next/image";
import Link from "next/link";
import { KIND_LABEL } from "@/lib/report";
import type { CaseFixture } from "@/lib/schema";
import { MaskedLines, Reveal } from "../motion/primitives";

function CaseTile({ c, hidden, width }: { c: CaseFixture; hidden?: boolean; width?: string }) {
  return (
    <Link href={`/cases/${c.slug}`} tabIndex={hidden ? -1 : undefined} className={`group block ${width ?? ""}`}>
      <div className="overflow-hidden rounded-[8px] border border-rule">
        <Image
          src={`/cases/${c.slug}-thumb.png`}
          alt=""
          width={540}
          height={675}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 45vw, 90vw"
          className="w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
        />
      </div>
      <p className="mt-3 text-[0.82rem] text-pencil">{KIND_LABEL[c.kind]}</p>
      <p className="mt-0.5 font-serif text-[1.8rem] leading-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{c.title}</p>
      <p className="text-[0.9rem] text-ink-3">{c.subtitle}</p>
    </Link>
  );
}

/**
 * The case studies on the landing page. A handful sit in a static row; a longer set
 * becomes an endless strip that pauses on hover or focus (static under reduced motion).
 */
export function CaseMarquee({ cases }: { cases: readonly CaseFixture[] }) {
  const strip = cases.length > 4;
  const loop = [...cases, ...cases];

  return (
    <section aria-labelledby="cases-strip-title" className="overflow-hidden border-b border-rule py-20 lg:py-28">
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-end justify-between gap-6 px-5 sm:px-8">
        <h2 id="cases-strip-title" className="max-w-[20ch] font-serif text-[2.6rem] leading-[1] tracking-tight sm:text-[3.8rem]">
          <MaskedLines lines={["Tested on real failures", "and planted risks."]} inView />
        </h2>
        <Reveal delay={0.2}>
          <Link href="/cases" className="text-pencil underline decoration-1 underline-offset-4 transition-[text-underline-offset] duration-300 hover:underline-offset-8">
            Browse the case studies
          </Link>
        </Reveal>
      </div>

      {strip ? (
        <div className="marquee mt-12 motion-reduce:overflow-x-auto" data-lenis-prevent-horizontal>
          <ul className="marquee-track flex w-max gap-6 pl-5 sm:pl-8">
            {loop.map((c, i) => (
              <li key={`${c.slug}-${i}`} aria-hidden={i >= cases.length ? true : undefined} className="w-[15rem] shrink-0 sm:w-[17rem]">
                <CaseTile c={c} hidden={i >= cases.length} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="mx-auto mt-12 grid max-w-[88rem] grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-12 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          {cases.map((c, i) => (
            <Reveal as="li" key={c.slug} delay={i * 0.1} y={32}>
              <CaseTile c={c} />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
