import type { CampaignInput } from "./schema";

/**
 * Cheap server-side screen that runs before any model call. It keeps the
 * analyzer from being used as a general-purpose image describer or chatbot.
 * The model applies a second check (isAdvertisingCreative) on the image itself.
 *
 * Copy fields may all be empty: the form no longer asks for them, and the
 * analyst reads the product name, headline and body copy from the creative.
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

export type GuardResult = { ok: true } | { ok: false; code: "off_purpose"; message: string };

export function screenCampaignInput(input: CampaignInput): GuardResult {
  const text = [input.productName, input.headline, input.bodyCopy, input.brandName ?? "", input.brandNotes ?? ""].join("\n");
  if (OFF_PURPOSE.some((p) => p.test(text))) {
    return {
      ok: false,
      code: "off_purpose",
      message: "Second Look only reviews ad campaigns. Put the ad on the table and use the notes for campaign details.",
    };
  }
  return { ok: true };
}
