import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-[88rem] items-baseline justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="whitespace-nowrap font-serif text-[1.5rem] leading-none tracking-tight text-ink sm:text-[1.65rem]">
          Second Look
        </Link>
        <nav aria-label="Primary" className="flex items-baseline gap-4 whitespace-nowrap text-[0.88rem] sm:gap-5 sm:text-[0.95rem]">
          <Link href="/" className="text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            Review a campaign
          </Link>
          <Link href="/cases" className="text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            Case studies
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto grid max-w-[88rem] gap-4 px-5 py-8 text-sm text-ink-3 sm:grid-cols-[1fr_auto] sm:px-8">
        <p className="max-w-[62ch]">
          Second Look flags and proposes; people decide. It is not a substitute for review by someone who lives in the market,
          and it will miss things. Findings by Claude, alternative creative by the{" "}
          <a href="https://docs.magichour.ai" className="text-pencil underline underline-offset-2">
            Magic Hour API
          </a>
          .
        </p>
        <p>
          <Link href="/cases/starbucks-korea" className="underline underline-offset-2 hover:text-ink">
            Why this exists
          </Link>
        </p>
      </div>
    </footer>
  );
}
