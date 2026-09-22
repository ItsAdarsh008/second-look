/**
 * The Second Look mark: the flagged region, and the badge numbering it — the same annotation the
 * report draws over a creative.
 *
 * Shares its geometry with `src/app/icon.svg`, which is the favicon's source. The two differ only
 * where they have to: the favicon carries a paper plate behind the mark so it survives a dark tab
 * strip, while this one is transparent and draws in `currentColor` so it follows the text beside it
 * into dark mode. Change one and change the other.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true" focusable="false">
      <rect x="17.5" y="17.5" width="33" height="33" rx="3.5" stroke="currentColor" strokeWidth="5" />
      <rect x="8" y="8" width="17" height="17" rx="2.5" fill="currentColor" />
    </svg>
  );
}
