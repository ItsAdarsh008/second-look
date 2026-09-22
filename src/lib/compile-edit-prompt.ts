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
  /**
   * Copy and timing findings whose words are set in the artwork. The prompt strikes the printed
   * form; the decision behind it stands, so these also appear in `unaddressable`.
   */
  printed: UnaddressableFinding[];
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

/** With printed wording being restyled, "preserve every piece of existing text" would contradict the change sentences. */
const PRESERVE_WITH_PRINTED_EDITS = DEFAULT_PRESERVE.filter((p) => !p.includes("existing text")).concat(
  "the type size, weight and position of any wording that is replaced",
);

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

/**
 * What the render actually did to a finding whose words are set in the artwork, as distinct from
 * the decision behind them. Kept separate from `explain` so the UI can say both: the poster no
 * longer reads "Tank", and the product is still called Tank.
 */
function explainPrinted(locus: Locus): string {
  switch (locus.kind) {
    case "copy":
      return locus.field === "productName"
        ? "The render replaces the printed wording. Renaming the product is a decision outside the image, and it stands."
        : "The render replaces the printed line. The copy decision behind it is outside the image, and it stands.";
    case "timing":
      return "The render removes the printed date. Moving the launch is a decision outside the image, and it stands.";
    default:
      return "";
  }
}

/** "5.18" — the badge form of a launch date, as it appears set in the artwork. */
function printedDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}.${day}`;
}

/**
 * Whether a finding has words that could be set in the creative, so an image editor can act on
 * their printed form. Every copy and timing finding qualifies; a concept has no printed form.
 *
 * Deliberately not narrowed to headlines and product names. The classifier is not dependable about
 * which field printed text belongs to — Tank Day's "5.18" badge, lettered into the artwork, has
 * come back as `body` — and gating on the field silently dropped it. The instruction targets the
 * printed occurrence "wherever it is set in the artwork", so wording that turns out not to be in
 * the image simply has nothing to match, which costs a clause rather than a wrong edit.
 */
function isPrinted(finding: Finding): boolean {
  return finding.locus.kind === "copy" || finding.locus.kind === "timing";
}

/**
 * Instructions for the printed form only. Deliberately built from the excerpt rather than from
 * `fixDirective`, because a directive for a copy finding also asks for things an image editor
 * cannot do — renaming the product, moving the launch — and those must not reach the render.
 */
function printedChangeSentence(finding: Finding): string {
  const { locus } = finding;
  if (locus.kind === "timing") {
    return `Remove the printed date badge reading “${printedDate(locus.date)}” and anything else in the artwork that states that date.`;
  }
  if (locus.kind !== "copy") return "";
  const words = cleanExcerpt(locus.excerpt);
  return locus.field === "productName"
    ? `Replace every printed occurrence of the wording “${words}”, including any headline lockup and pack strip, with neutral placeholder wording at the same size, weight and position.`
    : `Replace the printed line “${words}” with neutral placeholder wording at the same size, weight and position.`;
}

function cleanExcerpt(text: string): string {
  return text.replace(/\s+/g, " ").replace(/[“”"]/g, "").trim().slice(0, 80);
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

function preserveSentence(hasPrintedEdits: boolean): string {
  const keep = hasPrintedEdits ? PRESERVE_WITH_PRINTED_EDITS : DEFAULT_PRESERVE;
  return `Keep everything else exactly as it is: ${keep.slice(0, -1).join(", ")}, and ${keep.at(-1)}.`;
}

function brandNotesSentence(input: CampaignInput): string {
  const notes = input.brandNotes?.replace(/\s+/g, " ").trim();
  if (!notes) return "";
  const clipped = notes.length > MAX_BRAND_NOTES_CHARS ? `${notes.slice(0, MAX_BRAND_NOTES_CHARS).replace(/\s+\S*$/, "")}…` : notes;
  return `Brand direction to respect: ${clipped.replace(/[.\s]+$/, "")}.`;
}

function assemble(changes: readonly string[], input: CampaignInput, hasPrintedEdits = false): string {
  return [
    "Make a minimal, surgical retouch of this advertisement image, not a redesign.",
    ...changes,
    preserveSentence(hasPrintedEdits),
    brandNotesSentence(input),
    hasPrintedEdits
      ? "Beyond the wording named above, do not add any new text, logos, people or objects."
      : "Do not add any new text, logos, people or objects.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Turn findings into Magic Hour edit instructions.
 *
 * Image findings are addressable outright. A copy or timing finding is addressable only on its
 * surface: the words are lettered into the artwork, so the render can strike them, but the decision
 * they record — the product's name, the launch date — lives in the brief and survives the edit.
 * Those come back in both `printed` and `unaddressable`, because both statements are true and the
 * UI has to make both, or the render reads as a fix.
 */
export function compileEditPrompt(findings: readonly Finding[], input: CampaignInput): CompiledEdit {
  const bySeverity = (a: Finding, b: Finding) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.confidence - a.confidence;

  const imageFindings = findings.filter((f) => f.locus.kind === "image").sort(bySeverity);
  const printedFindings = findings.filter((f) => f.locus.kind !== "image" && isPrinted(f)).sort(bySeverity);

  const unaddressable: UnaddressableFinding[] = findings
    .filter((f) => f.locus.kind !== "image")
    .map((f) => ({ ...f, explanation: explain(f.locus) }));

  const printed: UnaddressableFinding[] = printedFindings.map((f) => ({ ...f, explanation: explainPrinted(f.locus) }));

  // Image findings first: they are the substantive repair, and they win the character budget.
  const queue: { finding: Finding; sentence: string; isPrinted: boolean }[] = [
    ...imageFindings.map((f) => ({ finding: f, sentence: changeSentence(f), isPrinted: false })),
    ...printedFindings.map((f) => ({ finding: f, sentence: printedChangeSentence(f), isPrinted: true })),
  ].filter((q) => q.sentence !== "");

  const addressed: Finding[] = [];
  const deferred: Finding[] = [];
  const changes: string[] = [];
  let printedInPrompt = false;
  for (const { finding, sentence, isPrinted: printedEdit } of queue) {
    const candidate = [...changes, sentence];
    if (assemble(candidate, input, printedInPrompt || printedEdit).length <= MAX_PROMPT_CHARS) {
      changes.push(sentence);
      printedInPrompt = printedInPrompt || printedEdit;
      if (!printedEdit) addressed.push(finding);
    } else if (!printedEdit) {
      deferred.push(finding);
    }
  }

  const variantPrompts = queue.map(({ finding, sentence, isPrinted: printedEdit }) => ({
    findingId: finding.id,
    prompt: assemble([sentence], input, printedEdit).slice(0, MAX_PROMPT_CHARS),
  }));

  return {
    prompt: changes.length > 0 ? assemble(changes, input, printedInPrompt) : "",
    addressed,
    printed,
    unaddressable,
    deferred,
    variantPrompts,
  };
}
