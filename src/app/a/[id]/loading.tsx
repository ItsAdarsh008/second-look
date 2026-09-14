export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-8" role="status" aria-live="polite">
      <p className="text-sm text-ink-3">Loading the report…</p>
      <div className="mt-6 h-12 w-2/3 rounded-[4px] bg-rule/60" />
      <div className="mt-8 h-64 rounded-[6px] border border-rule" />
    </div>
  );
}
