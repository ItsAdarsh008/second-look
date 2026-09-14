import { describe, expect, it, vi } from "vitest";
import { AnalysisError, analyzeCampaign, groundFindings } from "./analyze";
import { AnthropicClientError, type CreateMessage, type CreateMessageParams, type ModelMessage } from "./clients/anthropic";
import { ANALYST_SYSTEM_PROMPT, REVIEW_TOOL_NAME, reviewToolInputSchema } from "./prompts/analyst";
import type { FindingDraft, Incident } from "./schema";
import { tankInput, validDraft } from "@/test/fixtures";

const corpus: Incident[] = [
  {
    id: "starbucks-korea-tank-day-2026",
    brand: "Starbucks Korea",
    title: "Tank Day",
    year: 2026,
    markets: ["KR"],
    region: "South Korea",
    categories: ["historical-memory", "calendar-timing"],
    whatHappened: "x",
    whyItLanded: "x",
    outcome: "x",
    signals: ["tank", "may 18", "thwack"],
    sourceUrl: "https://www.nbcnews.com/world/asia/starbucks-tank-day-ad-campaign-south-korea-backlash-rcna346856",
  },
];

function message(content: ModelMessage["content"], stop_reason: ModelMessage["stop_reason"] = "tool_use"): ModelMessage {
  const partial = {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content,
    stop_reason,
    stop_sequence: null,
    stop_details: null,
    container: null,
    context_management: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };
  return partial as unknown as ModelMessage;
}

function toolCall(input: unknown, id = "toolu_1"): ModelMessage {
  return message([{ type: "tool_use", id, name: REVIEW_TOOL_NAME, input } as ModelMessage["content"][number]]);
}

const nameDraft: FindingDraft = {
  ...validDraft,
  severity: "high",
  category: "historical-memory",
  locus: { kind: "copy", field: "headline", excerpt: "Tank" },
  claim: "The product name 'Tank' on May 18 evokes the tanks sent against Gwangju protesters in 1980.",
  confidence: 0.9,
  precedents: [
    {
      kind: "referent",
      title: "Gwangju Democratization Movement",
      brand: null,
      year: 1980,
      market: "South Korea",
      summary: "Martial-law troops and armored vehicles suppressed a pro-democracy uprising in Gwangju.",
      outcome: null,
      sourceUrl: "https://made-up.example.com/gwangju",
    },
  ],
};

const loadImage = async () => ({ data: "iVBORw0KGgo=", mediaType: "image/png" as const });

function run(createMessage: CreateMessage) {
  return analyzeCampaign(tankInput, { createMessage, loadImage, corpus, id: "test-analysis" });
}

describe("analyzeCampaign", () => {
  it("returns validated, grounded findings sorted by severity then confidence", async () => {
    const createMessage = vi.fn<CreateMessage>().mockResolvedValue(
      toolCall({ isAdvertisingCreative: true, reviewNotes: "Checked name, date, slogan and image.", findings: [nameDraft, validDraft] }),
    );

    const result = await run(createMessage);

    expect(result.id).toBe("test-analysis");
    expect(result.findings.map((f) => f.severity)).toEqual(["critical", "high"]);
    expect(result.findings.every((f) => f.id.startsWith("f_"))).toBe(true);
    expect(result.corpusHits).toContain("starbucks-korea-tank-day-2026");

    const critical = result.findings[0];
    expect(critical.category).toBe("calendar-timing");
    expect(critical.precedents[0].sourceUrl).toBe(corpus[0].sourceUrl);

    const name = result.findings[1];
    // Excerpt "Tank" is not in the headline; it's re-homed to the product name.
    expect(name.locus).toMatchObject({ kind: "copy", field: "productName" });
    // A URL that isn't in the reference material is never shown.
    expect(name.precedents[0].sourceUrl).toBeUndefined();

    const params = createMessage.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5");
    expect(params.tools?.[0]).toMatchObject({ name: REVIEW_TOOL_NAME });
    const brief = JSON.stringify(params.messages[0].content);
    expect(brief).toContain("Launch date: 2026-05-18");
    expect(brief).toContain("Product name: \\\"Tank\\\"");
  });

  it("retries once with the validation error when the output is schema-invalid", async () => {
    const invalid = { isAdvertisingCreative: true, reviewNotes: "x", findings: [{ ...validDraft, precedents: [] }] };
    const valid = { isAdvertisingCreative: true, reviewNotes: "Checked.", findings: [validDraft] };
    const createMessage = vi
      .fn<CreateMessage>()
      .mockResolvedValueOnce(toolCall(invalid, "toolu_bad"))
      .mockResolvedValueOnce(toolCall(valid, "toolu_good"));

    const result = await run(createMessage);

    expect(createMessage).toHaveBeenCalledTimes(2);
    expect(result.findings).toHaveLength(1);
    const retryMessages: CreateMessageParams["messages"] = createMessage.mock.calls[1][0].messages;
    expect(retryMessages).toHaveLength(3);
    expect(retryMessages[1].role).toBe("assistant");
    const feedback = retryMessages[2];
    expect(feedback.role).toBe("user");
    expect(JSON.stringify(feedback.content)).toContain("toolu_bad");
    expect(JSON.stringify(feedback.content)).toContain("is_error");
  });

  it("throws a typed AnalysisError when the output is invalid twice", async () => {
    const invalid = toolCall({ isAdvertisingCreative: true, reviewNotes: "x", findings: [{ ...validDraft, confidence: 3 }] });
    const createMessage = vi.fn<CreateMessage>().mockResolvedValue(invalid);
    await expect(run(createMessage)).rejects.toMatchObject({ name: "AnalysisError", code: "invalid_output" });
    expect(createMessage).toHaveBeenCalledTimes(2);
  });

  it("treats zero findings as a real result", async () => {
    const createMessage = vi.fn<CreateMessage>().mockResolvedValue(
      toolCall({ isAdvertisingCreative: true, reviewNotes: "Name, copy, date and image examined; nothing found.", findings: [] }),
    );
    const result = await run(createMessage);
    expect(result.findings).toEqual([]);
    expect(result.reviewNotes).toContain("nothing found");
  });

  it("maps API errors to typed AnalysisErrors", async () => {
    const createMessage = vi.fn<CreateMessage>().mockRejectedValue(new AnthropicClientError("rate_limited", "429", 429));
    const err = await run(createMessage).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AnalysisError);
    expect(err).toMatchObject({ code: "rate_limited", status: 429 });
  });

  it("handles a model refusal gracefully", async () => {
    const createMessage = vi.fn<CreateMessage>().mockResolvedValue(message([], "refusal"));
    await expect(run(createMessage)).rejects.toMatchObject({ code: "refused" });
  });

  it("rejects images that aren't advertising creative", async () => {
    const createMessage = vi.fn<CreateMessage>().mockResolvedValue(
      toolCall({ isAdvertisingCreative: false, reviewNotes: "This is a personal holiday photo.", findings: [] }),
    );
    await expect(run(createMessage)).rejects.toMatchObject({ code: "not_ad_creative" });
  });

  it("nudges the model when it answers in text instead of calling the tool", async () => {
    const createMessage = vi
      .fn<CreateMessage>()
      .mockResolvedValueOnce(message([{ type: "text", text: "Here is my review…", citations: null } as ModelMessage["content"][number]], "end_turn"))
      .mockResolvedValueOnce(toolCall({ isAdvertisingCreative: true, reviewNotes: "Checked.", findings: [] }));
    const result = await run(createMessage);
    expect(result.findings).toEqual([]);
    expect(createMessage).toHaveBeenCalledTimes(2);
  });
});

describe("groundFindings", () => {
  it("caps confidence on reasoning-only findings", () => {
    const draft: FindingDraft = {
      ...validDraft,
      confidence: 0.9,
      precedents: [
        { kind: "reasoning", title: "No citable case", brand: null, year: null, market: "South Korea", summary: "Reason.", outcome: null },
      ],
    };
    const [finding] = groundFindings([draft], tankInput, corpus, []);
    expect(finding.confidence).toBe(0.5);
  });

  it("restricts markets to the campaign's markets", () => {
    const [finding] = groundFindings([{ ...validDraft, markets: ["JP", "KR"] }], tankInput, corpus, []);
    expect(finding.markets).toEqual(["KR"]);
  });
});

describe("analyst prompt", () => {
  it("does not leak any fixture case into the system prompt", () => {
    expect(ANALYST_SYSTEM_PROMPT).not.toMatch(/tank|gwangju|starbucks|thwack|pajero|rising sun|purity/i);
  });

  it("forbids vague hedging and permits zero findings", () => {
    expect(ANALYST_SYSTEM_PROMPT).toContain("Zero findings is a real answer");
    expect(ANALYST_SYSTEM_PROMPT).toContain("Some audiences may find");
  });

  it("derives a tool schema that requires precedents on every finding", () => {
    const schema = JSON.stringify(reviewToolInputSchema());
    expect(schema).toContain("precedents");
    expect(schema).toContain("fixDirective");
    expect(schema).not.toContain("$schema");
  });
});
