"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A primary-nav link that marks itself when you are on its page.
 *
 * Its own component, and a client one, because `SiteHeader` is a server component — it reads
 * `capabilities()` — and the current path is only knowable in the browser.
 *
 * `match` is a prefix for sections: /cases/green-hat should still light "Case studies". Home is
 * exact, or it would match everything.
 */
export function NavLink({
  href,
  match,
  className = "",
  children,
}: {
  href: string;
  /** Prefix that counts as being on this page. Defaults to an exact match on `href`. */
  match?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = match ? pathname === match || pathname.startsWith(`${match}/`) : pathname === href;

  return (
    <Link
      href={href}
      // aria-current is what actually tells a screen reader which page this is; the colour and rule
      // are the sighted half of the same statement.
      aria-current={active ? "page" : undefined}
      className={`underline-offset-4 transition-colors ${
        active ? "text-ink underline decoration-pencil decoration-2" : "text-ink-2 hover:text-ink hover:underline"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
