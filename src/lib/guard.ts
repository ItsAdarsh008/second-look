import type { CampaignInput } from "./schema";

/**
 * Cheap server-side screen that runs before any model call. It keeps the
 * analyzer from being used as a general-purpose image describer or chatbot.
 * The model applies a second check (isAdvertisingCreative) on the image itself.
 */

const OFF_PURPOSE = [
  /\bignore (all |any )?(previous|prior|above|earlier) (instructions|prompts?|rules)\b/i,
  /\b(system|developer) prompt\b/i,
  /\bdescribe (this|the) (image|photo|picture)\b/i,
  /\bwhat('?s| is) in (this|the) (image|photo|picture)\b/i,
  /\b(transcribe|ocr|extract (the )?text from)\b/i,
  /\byou are now\b/i,
  /\b(act|pretend) as (an? )?(assistant|ai|chatbot|gpt|claude)\b/i,
  /\bwrite (me )?(an? )?(essay|poem|story|code|script)\b/i,
];

export type GuardResult = { ok: true } | { ok: false; code: "empty_campaign" | "off_purpose"; message: string };

export function screenCampaignInput(input: CampaignInput): GuardResult {
  const copy = [input.productName, input.headline, input.bodyCopy].map((s) => s.trim());
  if (copy.every((s) => s.length === 0)) {
    return {
      ok: false,
      code: "empty_campaign",
      message: "Add at least a product name, headline or body copy. Most cultural risk lives in the words, not the picture.",
    };
  }
  const text = [...copy, input.brandName ?? "", input.brandNotes ?? ""].join("\n");
  if (OFF_PURPOSE.some((p) => p.test(text))) {
    return {
      ok: false,
      code: "off_purpose",
      message: "Second Look only reviews ad campaigns. Submit the campaign's actual copy and creative.",
    };
  }
  return { ok: true };
}
