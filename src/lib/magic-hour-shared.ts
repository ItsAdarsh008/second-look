import type { MagicHourAspectRatio, MagicHourModel, MagicHourResolution } from "./schema";

/** Client-safe pieces of the Magic Hour integration: request shape, costs and snippets. No secrets here. */

export const MAGIC_HOUR_DOCS_URL = "https://docs.magichour.ai";
export const MAGIC_HOUR_EDITOR_DOCS_URL = "https://docs.magichour.ai/api-reference/image-projects/ai-image-editor";

export interface EditImageParams {
  prompt: string;
  imageFilePaths: string[];
  model: MagicHourModel;
  aspectRatio?: MagicHourAspectRatio;
  resolution?: MagicHourResolution;
  imageCount?: 1 | 4;
  name?: string;
}

/** Exact JSON body for POST /v1/ai-image-editor. */
export interface EditImageRequestBody {
  name?: string;
  image_count: 1 | 4;
  model: MagicHourModel;
  aspect_ratio: MagicHourAspectRatio;
  resolution: MagicHourResolution;
  style: { prompt: string };
  assets: { image_file_paths: string[] };
}

export function buildEditRequestBody(params: EditImageParams): EditImageRequestBody {
  return {
    ...(params.name ? { name: params.name } : {}),
    image_count: params.imageCount ?? 1,
    model: params.model,
    aspect_ratio: params.aspectRatio ?? "auto",
    resolution: params.resolution ?? "auto",
    style: { prompt: params.prompt },
    assets: { image_file_paths: params.imageFilePaths },
  };
}

/** Published per-image credit costs (docs.magichour.ai, AI Image Editor). `default` is model-dependent. */
/**
 * Credits per image, used both to quote a run in the UI and to reserve against the daily ceiling.
 *
 * `gpt-image-2` is 100 from a measured 1k run, not the 50 published. The reservation is what the
 * ceiling checks, so under-quoting let a run be admitted on half the headroom it needed and then
 * overshoot when `settleCredits` corrected it to the real charge. Over-quoting is safe — settling
 * refunds the difference — so when a figure is in doubt, the higher one belongs here.
 */
export const MODEL_CREDITS_PER_IMAGE: Record<MagicHourModel, number | null> = {
  default: null,
  "flux-2-klein": 5,
  "gpt-image-2": 100,
  "nano-banana-2": 100,
};

export const MODEL_DESCRIPTIONS: Record<MagicHourModel, string> = {
  default: "Magic Hour chooses the model for the edit. The cost depends on its choice.",
  "flux-2-klein": "The compact FLUX.2 model. Lowest cost and quickest turnaround for simple edits.",
  "gpt-image-2": "OpenAI's image model. Strong at following long written instructions.",
  "nano-banana-2": "Google's Gemini image model. Strong at targeted edits that leave the rest intact.",
};

/** Conservative estimate used for the daily ceiling before Magic Hour reports the real charge. */
export function estimateCredits(model: MagicHourModel, imageCount: 1 | 4): number {
  return (MODEL_CREDITS_PER_IMAGE[model] ?? 100) * imageCount;
}

function shellQuote(json: string): string {
  return `'${json.replace(/'/g, `'\\''`)}'`;
}

export function curlSnippet(body: EditImageRequestBody): string {
  return [
    "curl --request POST https://api.magichour.ai/v1/ai-image-editor \\",
    '  --header "Authorization: Bearer $MAGIC_HOUR_API_KEY" \\',
    '  --header "Content-Type: application/json" \\',
    `  --data ${shellQuote(JSON.stringify(body, null, 2))}`,
  ].join("\n");
}

export function nodeSnippet(body: EditImageRequestBody): string {
  const json = JSON.stringify(body, null, 2).replace(/\n/g, "\n  ");
  return `const API = "https://api.magichour.ai/v1";
const headers = {
  Authorization: \`Bearer \${process.env.MAGIC_HOUR_API_KEY}\`,
  "Content-Type": "application/json",
};

// Submit the edit
const res = await fetch(\`\${API}/ai-image-editor\`, {
  method: "POST",
  headers,
  body: JSON.stringify(${json}),
});
const { id, credits_charged } = await res.json();

// Poll until the render finishes
let project;
do {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  project = await fetch(\`\${API}/image-projects/\${id}\`, { headers }).then((r) => r.json());
} while (project.status === "queued" || project.status === "rendering");

console.log(project.status, project.downloads.map((d) => d.url));`;
}
