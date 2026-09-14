import { SEVERITY_RANK, type CampaignInput, type Finding, type Locus } from "./schema";

export const MAX_PROMPT_CHARS = 1500;
const MAX_DIRECTIVE_CHARS = 240;
const MAX_BRAND_NOTES_CHARS = 280;

export type UnaddressableFinding = Finding & { explanation: string };

export interface CompiledEdit {
  /** One art-direction paragraph covering every addressed finding. Empty when nothing is addressable. */
  prompt: string;
  /** Image findings the prompt covers. */
  addressed: Finding[];
  /** Copy, timing and concept findings. Image editing cannot resolve these; the UI must show them. */
  unaddressable: UnaddressableFinding[];
  /** Image findings that fit only as individual variants because the combined prompt hit its length cap. */
  deferred: Finding[];
  /** One prompt per image finding, so a user can address one at a time. */
  variantPrompts: { findingId: string; prompt: string }[];
}

const DEFAULT_PRESERVE = [
  "the product and its packaging",
  "the logo and its placement",
  "every piece of existing text and its legibility",
  "the brand colors",
  "the composition and framing",
  "the lighting and illustration style",
];

const GERUNDS: Record<string, string> = {
  replacing: "replace",
  removing: "remove",
  changing: "change",
  swapping: "swap",
  recoloring: "recolor",
  recolouring: "recolour",
  moving: "move",
  using: "use",
  making: "make",
  adding: "add",
  cropping: "crop",
  softening: "soften",
  shifting: "shift",
  covering: "cover",
  repainting: "repaint",
  toning: "tone",
  turning: "turn",
  redrawing: "redraw",
  simplifying: "simplify",
  adjusting: "adjust",
};

const HEDGES: [RegExp, string | ((match: string, ...groups: string[]) => string)][] = [
  [/\b(?:please\s+)?consider\s+(\w+ing)\b/gi, (_m, gerund: string) => GERUNDS[gerund.toLowerCase()] ?? gerund],
  [/\bconsider\s+/gi, ""],
  [/\b(if possible|where possible|as needed|if needed|perhaps|possibly|potentially|ideally|somewhat|try to|you may want to|it may help to)\b[,]?\s*/gi, ""],
  [/\b(might|could|may)\s+(want to\s+)?/gi, ""],
  [/\((critical|high|moderate|low)( severity)?\)/gi, ""],
];

function explain(locus: Locus): string {
  switch (locus.kind) {
    case "copy":
      return locus.field === "productName"
        ? "Requires renaming the product — image editing cannot resolve this."
        : "Requires a copy change — image editing cannot resolve this.";
    case "timing":
      return "Requires a scheduling change — image editing cannot resolve this.";
    case "concept":
      return "Requires rethinking the campaign idea — image editing cannot resolve this.";
    case "image":
      return "";
  }
}

/** Plain-language position of a normalized bbox, e.g. "lower right" or "most of the frame". */
export function describeRegion(bbox: readonly [number, number, number, number]): string {
  const [x, y, w, h] = bbox;
  if (w * h >= 0.5) return "across most of the frame";
  const cx = x + w / 2;
  const cy = y + h / 2;
  const vertical = cy < 0.4 ? "upper" : cy > 0.6 ? "lower" : "middle";
  const horizontal = cx < 0.4 ? "left" : cx > 0.6 ? "right" : "center";
  if (vertical === "middle" && horizontal === "center") return "in the center";
  if (vertical === "middle") return `on the ${horizontal}`;
  return `in the ${vertical} ${horizontal}`;
}

function cleanDirective(text: string): string {
  let out = text.trim();
  for (const [pattern, replacement] of HEDGES) {
    // Narrowed separately to satisfy String.replace's overloads.
    out = typeof replacement === "string" ? out.replace(pattern, replacement) : out.replace(pattern, replacement);
  }
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
  out = out.replace(/[.;,\s]+$/, "");
  if (out.length > MAX_DIRECTIVE_CHARS) out = `${out.slice(0, MAX_DIRECTIVE_CHARS - 1).replace(/\s+\S*$/, "")}`;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

const SAYS_WHERE = /\b(left|right|top|bottom|upper|lower|cent(er|re)|corner|background|foreground|behind|beneath|above|below)\b/i;

function changeSentence(finding: Finding): string {
  if (finding.locus.kind !== "image") return "";
  const directive = cleanDirective(finding.fixDirective);
  // Only add a position hint when the directive doesn't already say where.
  return SAYS_WHERE.test(directive) ? `${directive}.` : `${directive} (${describeRegion(finding.locus.bbox)}).`;
}

function preserveSentence(): string {
  return `Keep everything else exactly as it is: ${DEFAULT_PRESERVE.slice(0, -1).join(", ")}, and ${DEFAULT_PRESERVE.at(-1)}.`;
}

function brandNotesSentence(input: CampaignInput): string {
  const notes = input.brandNotes?.replace(/\s+/g, " ").trim();
  if (!notes) return "";
  const clipped = notes.length > MAX_BRAND_NOTES_CHARS ? `${notes.slice(0, MAX_BRAND_NOTES_CHARS).replace(/\s+\S*$/, "")}…` : notes;
  return `Brand direction to respect: ${clipped.replace(/[.\s]+$/, "")}.`;
}

function assemble(changes: readonly string[], input: CampaignInput): string {
  return [
    "Make a minimal, surgical retouch of this advertisement image, not a redesign.",
    ...changes,
    preserveSentence(),
    brandNotesSentence(input),
    "Do not add any new text, logos, people or objects.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Turn findings into Magic Hour edit instructions. Only image findings are
 * addressable; everything else is returned with an explanation so the UI can
 * say plainly what image editing cannot do.
 */
export function compileEditPrompt(findings: readonly Finding[], input: CampaignInput): CompiledEdit {
  const imageFindings = findings
    .filter((f) => f.locus.kind === "image")
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.confidence - a.confidence);

  const unaddressable: UnaddressableFinding[] = findings
    .filter((f) => f.locus.kind !== "image")
    .map((f) => ({ ...f, explanation: explain(f.locus) }));

  const addressed: Finding[] = [];
  const deferred: Finding[] = [];
  const changes: string[] = [];
  for (const finding of imageFindings) {
    const candidate = [...changes, changeSentence(finding)];
    if (assemble(candidate, input).length <= MAX_PROMPT_CHARS) {
      changes.push(changeSentence(finding));
      addressed.push(finding);
    } else {
      deferred.push(finding);
    }
  }

  const variantPrompts = imageFindings.map((f) => ({
    findingId: f.id,
    prompt: assemble([changeSentence(f)], input).slice(0, MAX_PROMPT_CHARS),
  }));

  return {
    prompt: addressed.length > 0 ? assemble(changes, input) : "",
    addressed,
    unaddressable,
    deferred,
    variantPrompts,
  };
}
