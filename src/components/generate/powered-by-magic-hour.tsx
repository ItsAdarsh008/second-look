/**
 * Magic Hour's logo mark, taken from the header of magichour.ai, where it's also drawn
 * in currentColor next to the name set as text.
 */
export function MagicHourMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 29 26" fill="currentColor" aria-hidden className={className}>
      <path d="M28.9376 17.7504L20.6061 0.179184C20.5245 0.00554876 20.2345 0.00554876 20.1529 0.179184L17.1524 6.50446C17.128 6.55304 17.128 6.60885 17.1512 6.65846L22.4639 17.9044C22.5017 17.983 22.5906 18.0347 22.6905 18.0347H28.7098C28.8828 18.0347 29.0021 17.8869 28.9376 17.7504ZM8.85138 0.179184L17.7286 18.938C17.7518 18.9876 17.7518 19.0434 17.7274 19.093L14.7269 25.4193C14.6441 25.593 14.3553 25.593 14.2725 25.4193L8.85016 13.9832C8.76854 13.8106 8.4786 13.8106 8.39698 13.9832L6.53674 17.9034C6.49897 17.9819 6.40882 18.0336 6.31015 18.0336L0.289647 18.0326C0.116659 18.0326 -0.00151013 17.8848 0.0630564 17.7484L8.39698 0.17815C8.47982 0.00554896 8.76854 0.00554876 8.85138 0.179184Z" />
    </svg>
  );
}

/** "Powered by Magic Hour" on everything that generates new creative, linking to their API. */
export function PoweredByMagicHour({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://magichour.ai/developer"
      target="_blank"
      rel="noreferrer"
      className={`inline-flex shrink-0 items-center gap-2 rounded-[6px] border border-rule bg-sheet px-3 py-1.5 text-[0.8rem] text-ink-3 transition-colors hover:border-ink hover:text-ink ${className}`}
    >
      Powered by
      <span className="inline-flex items-center gap-1.5 text-[0.92rem] font-semibold text-ink">
        <MagicHourMark className="h-[0.9rem] w-auto" />
        Magic Hour
      </span>
    </a>
  );
}
