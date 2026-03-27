import type { LLMTool } from "./config";

// ── Types ────────────────────────────────────────────────────────────────

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMStreamParams {
  model: string;
  messages: LLMMessage[];
  tools?: LLMToolForAPI[];
  temperature?: number;
  max_tokens?: number;
}

export interface LLMToolForAPI {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMStreamChunk {
  type: "text_delta" | "tool_calls" | "done" | "error";
  content?: string;
  toolCalls?: LLMToolCall[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  finishReason?: string | null;
}

export interface LLMCompleteResult {
  content: string | null;
  toolCalls: LLMToolCall[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  finishReason: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────

export function toolDefsToAPI(tools: LLMTool[]): LLMToolForAPI[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

// ── OpenRouter Client ────────────────────────────────────────────────────

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * OpenRouterClient — LLM inference via OpenRouter.
 * Supports streaming (SSE) and single-shot completions.
 * Handles 429 / 5xx retries with exponential backoff.
 */
export class OpenRouterClient {
  private apiKey: string;
  private siteUrl: string;
  private siteName: string;

  constructor(opts?: { apiKey?: string; siteUrl?: string; siteName?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.OPENROUTER_API_KEY ?? "";
    this.siteUrl = opts?.siteUrl ?? process.env.SITE_URL ?? "https://spokestack.io";
    this.siteName = opts?.siteName ?? "SpokeStack";
  }

  // ── Streaming ────────────────────────────────────────────────────────

  async *stream(params: LLMStreamParams): AsyncGenerator<LLMStreamChunk> {
    const body = this.buildRequestBody(params, true);
    const response = await this.fetchWithRetry(body);

    if (!response.body) {
      yield { type: "error", content: "No response body from OpenRouter" };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Accumulated tool call state across deltas
    const pendingToolCalls = new Map<
      number,
      { id: string; functionName: string; arguments: string }
    >();
    let accumulatedUsage: LLMStreamChunk["usage"] | undefined;
    let lastFinishReason: string | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            // Flush any pending tool calls
            if (pendingToolCalls.size > 0) {
              const toolCalls: LLMToolCall[] = [];
              for (const [, tc] of pendingToolCalls) {
                toolCalls.push({
                  id: tc.id,
                  type: "function",
                  function: { name: tc.functionName, arguments: tc.arguments },
                });
              }
              yield { type: "tool_calls", toolCalls };
              pendingToolCalls.clear();
            }
            yield { type: "done", usage: accumulatedUsage, finishReason: lastFinishReason };
            return;
          }

          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }

          // Track usage if present
          if (parsed.usage) {
            accumulatedUsage = parsed.usage;
          }

          const choice = parsed.choices?.[0];
          if (!choice) continue;

          if (choice.finish_reason) {
            lastFinishReason = choice.finish_reason;
          }

          const delta = choice.delta;
          if (!delta) continue;

          // Text content
          if (delta.content) {
            yield { type: "text_delta", content: delta.content };
          }

          // Tool calls (streamed incrementally)
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!pendingToolCalls.has(idx)) {
                pendingToolCalls.set(idx, {
                  id: tc.id ?? "",
                  functionName: tc.function?.name ?? "",
                  arguments: tc.function?.arguments ?? "",
                });
              } else {
                const existing = pendingToolCalls.get(idx)!;
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.functionName += tc.function.name;
                if (tc.function?.arguments) existing.arguments += tc.function.arguments;
              }
            }
          }

          // If finish_reason is "tool_calls" or "stop" and we have pending calls, flush them
          if (
            choice.finish_reason === "tool_calls" &&
            pendingToolCalls.size > 0
          ) {
            const toolCalls: LLMToolCall[] = [];
            for (const [, tc] of pendingToolCalls) {
              toolCalls.push({
                id: tc.id,
                type: "function",
                function: { name: tc.functionName, arguments: tc.arguments },
              });
            }
            yield { type: "tool_calls", toolCalls };
            pendingToolCalls.clear();
          }
        }
      }

      // End of stream without [DONE] — flush remaining
      if (pendingToolCalls.size > 0) {
        const toolCalls: LLMToolCall[] = [];
        for (const [, tc] of pendingToolCalls) {
          toolCalls.push({
            id: tc.id,
            type: "function",
            function: { name: tc.functionName, arguments: tc.arguments },
          });
        }
        yield { type: "tool_calls", toolCalls };
      }
      yield { type: "done", usage: accumulatedUsage, finishReason: lastFinishReason };
    } finally {
      reader.releaseLock();
    }
  }

  // ── Single-shot completion ───────────────────────────────────────────

  async complete(params: LLMStreamParams): Promise<LLMCompleteResult> {
    const body = this.buildRequestBody(params, false);
    const response = await this.fetchWithRetry(body);
    const json = (await response.json()) as any;

    const choice = json.choices?.[0];
    const message = choice?.message;

    return {
      content: message?.content ?? null,
      toolCalls: message?.tool_calls ?? [],
      usage: json.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      finishReason: choice?.finish_reason ?? null,
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────

  private buildRequestBody(params: LLMStreamParams, stream: boolean): object {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4096,
      stream,
    };

    if (stream) {
      body.stream_options = { include_usage: true };
    }

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools;
      body.tool_choice = "auto";
    }

    return body;
  }

  private async fetchWithRetry(body: object): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": this.siteUrl,
            "X-Title": this.siteName,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) return response;

        // Retry on 429 (rate limit) and 5xx (server error)
        if (response.status === 429 || response.status >= 500) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          const jitter = Math.random() * backoff * 0.5;
          console.warn(
            `OpenRouter ${response.status} on attempt ${attempt + 1}/${MAX_RETRIES}, retrying in ${Math.round(backoff + jitter)}ms`
          );
          await sleep(backoff + jitter);
          continue;
        }

        // Non-retryable error
        const errorText = await response.text().catch(() => "unknown");
        throw new Error(
          `OpenRouter API error ${response.status}: ${errorText}`
        );
      } catch (err) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES - 1) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await sleep(backoff);
        }
      }
    }

    throw lastError ?? new Error("OpenRouter request failed after retries");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
