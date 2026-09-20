/**
 * Structured, privacy-preserving logs. Never pass image bytes, full copy, or
 * prompts here — ids, markets, counts, credits and latency only.
 */

type Fields = Record<string, string | number | boolean | null | undefined | readonly string[]>;

type Event =
  | "analysis.completed"
  | "analysis.failed"
  | "analysis.retry"
  | "generation.submitted"
  | "generation.polled"
  | "generation.failed"
  | "ratelimit.blocked"
  | "credits.ceiling"
  | "upload.completed"
  | "request.rejected"
  | "billing.charged"
  | "billing.refunded"
  | "billing.payment_required"
  | "billing.fulfilled"
  | "billing.checkout"
  | "billing.webhook";

function emit(level: "info" | "warn" | "error", event: Event, fields: Fields): void {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...fields });
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: Event, fields: Fields = {}) => emit("info", event, fields),
  warn: (event: Event, fields: Fields = {}) => emit("warn", event, fields),
  error: (event: Event, fields: Fields = {}) => emit("error", event, fields),
};
