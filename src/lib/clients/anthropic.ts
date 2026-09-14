import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const ANALYST_MODEL = "claude-opus-5";

export type CreateMessageParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
export type ModelMessage = Anthropic.Beta.Messages.BetaMessage;
export type CreateMessage = (params: CreateMessageParams) => Promise<ModelMessage>;

export type AnthropicErrorCode =
  | "not_configured"
  | "auth"
  | "rate_limited"
  | "overloaded"
  | "bad_request"
  | "connection"
  | "upstream";

export class AnthropicClientError extends Error {
  readonly code: AnthropicErrorCode;
  readonly status: number | undefined;

  constructor(code: AnthropicErrorCode, message: string, status?: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AnthropicClientError";
    this.code = code;
    this.status = status;
  }

  /** Worth one retry with backoff. */
  get retryable(): boolean {
    return this.code === "rate_limited" || this.code === "overloaded" || this.code === "connection";
  }
}

function toClientError(err: unknown): AnthropicClientError {
  if (err instanceof AnthropicClientError) return err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AnthropicClientError("auth", "Anthropic rejected the API key.", err.status, { cause: err });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AnthropicClientError("rate_limited", "Anthropic rate limit reached.", err.status, { cause: err });
  }
  if (err instanceof Anthropic.BadRequestError || err instanceof Anthropic.UnprocessableEntityError) {
    return new AnthropicClientError("bad_request", err.message, err.status, { cause: err });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AnthropicClientError("connection", "Could not reach Anthropic.", undefined, { cause: err });
  }
  if (err instanceof Anthropic.APIError) {
    const code = err.status === 529 || err.status === 503 ? "overloaded" : "upstream";
    return new AnthropicClientError(code, `Anthropic API error ${err.status ?? ""}`.trim(), err.status, { cause: err });
  }
  return new AnthropicClientError("upstream", "Unexpected error calling Anthropic.", undefined, { cause: err });
}

let client: Anthropic | null = null;

/** Real Messages API call, with SDK errors mapped to `AnthropicClientError`. */
export const createMessage: CreateMessage = async (params) => {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new AnthropicClientError("not_configured", "ANTHROPIC_API_KEY is not set.");
  }
  client ??= new Anthropic({ maxRetries: 2, timeout: 280_000 });
  try {
    return await client.beta.messages.create(params);
  } catch (err) {
    throw toClientError(err);
  }
};

export { toClientError };
