/**
 * The Second Look mark: the badge, the region it flags, and the number of the finding — 2, for the
 * second look. The same annotation the report draws over a creative.
 *
 * Shares its geometry with `src/app/icon.svg`, which is the favicon's source. The two differ only
 * where they have to: the favicon carries a paper plate behind the mark so it survives a dark tab
 * strip, while this one is transparent and draws in `currentColor` so it follows the text beside it
 * into dark mode. Change one and change the other.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true" focusable="false">
      <rect x="7" y="7" width="16" height="16" rx="2.5" fill="currentColor" />
      <rect x="19.5" y="19.5" width="35" height="35" rx="3.5" stroke="currentColor" strokeWidth="5" />
      <path
        fill="currentColor"
        transform="translate(20.5 21.4)"
        d="M9.7 11.9c.2-3.4 2.9-5.6 6.8-5.6 3.8 0 6.5 2.2 6.5 5.4 0 2.2-1.1 3.9-4 6.6l-3.6 3.4v.2h7.8V25H9.8v-2.7l6.4-6.1c1.9-1.8 2.5-2.7 2.5-3.8 0-1.4-1-2.4-2.5-2.4-1.6 0-2.6 1-2.6 2.5v.2H9.7v-.8Z"
      />
    </svg>
  );
}
