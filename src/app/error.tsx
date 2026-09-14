"use client";

import Link from "next/link";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
      <h1 className="font-serif text-[2.6rem] leading-tight">This page didn&rsquo;t load.</h1>
      <p className="mt-4 max-w-[54ch] text-ink-2">
        Something failed while rendering it. Nothing you submitted was lost on our side. Try again, or start from the home page.
      </p>
      <p className="mt-6 flex gap-6">
        <button type="button" onClick={reset} className="text-pencil underline underline-offset-4">
          Try again
        </button>
        <Link href="/" className="text-pencil underline underline-offset-4">
          Go to the home page
        </Link>
      </p>
    </div>
  );
}
