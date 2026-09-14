import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
      <p className="text-sm text-ink-3">404</p>
      <h1 className="mt-2 font-serif text-[3rem] leading-none">There&rsquo;s nothing on this page.</h1>
      <p className="mt-4 max-w-[54ch] text-ink-2">
        If you followed a link to a report, it may have expired. Shared reports are kept for 90 days.
      </p>
      <p className="mt-6 flex gap-6">
        <Link href="/" className="text-pencil underline underline-offset-4">
          Review a campaign
        </Link>
        <Link href="/cases" className="text-pencil underline underline-offset-4">
          Browse case studies
        </Link>
      </p>
    </div>
  );
}
