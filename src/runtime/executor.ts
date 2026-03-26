import {
  AgentType,
  SurfaceType,
  BillingTierType,
  PrismaClient,
} from "@prisma/client";
import { buildAgentConfig, type AgentConfig, type LLMTool } from "./config";
import { CoreToolkit } from "./toolkit";
import {
  OpenRouterClient,
  toolDefsToAPI,
  type LLMMessage,
  type LLMToolCall,
} from "./models";
import { checkRateLimit } from "./ratelimit";
import {
  loadRelevantContext,
  formatContextForPrompt,
  evaluateContextUpdates,
} from "./context";
import { executeToolCalls } from "./tools/index";
import {
  TASKS_TOOLS,
  PROJECTS_TOOLS,
  BRIEFS_TOOLS,
  ORDERS_TOOLS,
  ONBOARDING_TOOLS,
  CONTEXT_TOOLS,
} from "./tools/definitions";
import { ONBOARDING_AGENT } from "./agents/onboarding";
import { TASKS_AGENT } from "./agents/tasks";
import { PROJECTS_AGENT } from "./agents/projects";
import { BRIEFS_AGENT } from "./agents/briefs";
import { ORDERS_AGENT } from "./agents/orders";

// ── Types ────────────────────────────────────────────────────────────────

export interface AgentStreamChunk {
  type: "text" | "tool_progress" | "error" | "done";
  content: string;
  tools?: unknown[];
  sessionId?: string;
  usage?: { promptTokens: number; completionTokens: number };
}

interface ExecuteTurnParams {
  sessionId?: string;
  message: string;
  orgId: string;
  userId?: string;
  surface: string;
  agentType: AgentType;
}

// ── Constants ────────────────────────────────────────────────────────────

const MAX_TOOL_LOOPS = 10;
const HISTORY_LIMIT = 50;

// ── Shared Prisma + LLM Clients ──────────────────────────────────────────

const prisma = new PrismaClient();
const llm = new OpenRouterClient();

// ── Agent Executor ───────────────────────────────────────────────────────

/**
 * AgentExecutor — the core loop that runs an agent conversation turn.
 *
 * Flow:
 *   1. Load or create AgentSession
 *   2. Build agent config (system prompt + tools scoped by tier)
 *   3. Load conversation history
 *   4. Load relevant context graph entries
 *   5. Check rate limit
 *   6. Record user message
 *   7. Build LLM messages array
 *   8. Call OpenRouter with streaming
 *   9. Tool use loop (when LLM returns tool_calls)
 *  10. Stream text chunks to the caller
 *  11. Record agent message with token count + meter the call
 *  12. Post-turn: evaluate context graph updates
 */
export class AgentExecutor {
  async *executeTurn(
    params: ExecuteTurnParams
  ): AsyncGenerator<AgentStreamChunk> {
    const { message, orgId, userId, surface, agentType } = params;

    try {
      // ── 1. Load or create session ──────────────────────────────────
      const session = await this.getOrCreateSession(
        orgId,
        agentType,
        surface as SurfaceType,
        userId,
        params.sessionId
      );

      // ── 2. Build agent config ──────────────────────────────────────
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { billingAccount: true, modules: true },
      });

      if (!org) {
        yield { type: "error", content: "Organization not found." };
        return;
      }

      const tier: BillingTierType = org.billingAccount?.tier ?? "FREE";
      const config = await buildAgentConfig(org as any, agentType);
      const agentDef = this.getAgentDefinition(agentType);
      const tools = this.getToolsForAgent(agentType);

      // Override system prompt with agent-specific builder if available
      const systemPrompt = agentDef.buildSystemPrompt(org.name);

      // ── 3. Load conversation history ───────────────────────────────
      const history = await this.loadHistory(session.id);

      // ── 4. Load relevant context graph entries ─────────────────────
      const contextEntries = await loadRelevantContext(
        prisma,
        orgId,
        agentType
      );
      const contextBlock = formatContextForPrompt(contextEntries);

      // ── 5. Check rate limit ────────────────────────────────────────
      const rateResult = await checkRateLimit(orgId, tier);
      if (!rateResult.allowed) {
        yield {
          type: "error",
          content: `Rate limit exceeded. Please wait ${Math.ceil((rateResult.retryAfterMs ?? 60000) / 1000)} seconds before sending another message.`,
        };
        return;
      }

      // ── 6. Record user message ─────────────────────────────────────
      await prisma.agentMessage.create({
        data: {
          sessionId: session.id,
          userId: userId ?? null,
          role: "USER",
          content: message,
        },
      });

      // ── 7. Build LLM messages array ────────────────────────────────
      const llmMessages = this.buildLLMMessages(
        systemPrompt,
        contextBlock,
        history,
        message
      );

      const toolDefs = toolDefsToAPI(tools);
      const toolkit = new CoreToolkit(prisma, orgId);

      // ── 8-9. LLM call with streaming + tool use loop ──────────────
      let fullResponse = "";
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let loopCount = 0;

      while (loopCount < MAX_TOOL_LOOPS) {
        loopCount++;

        let pendingToolCalls: LLMToolCall[] = [];
        let chunkText = "";

        // Stream from LLM
        for await (const chunk of llm.stream({
          model: agentDef.model ?? config.model,
          messages: llmMessages,
          tools: toolDefs.length > 0 ? toolDefs : undefined,
          temperature: agentDef.temperature ?? 0.7,
          max_tokens: agentDef.maxTokens ?? 4096,
        })) {
          switch (chunk.type) {
            case "text_delta":
              if (chunk.content) {
                chunkText += chunk.content;
                fullResponse += chunk.content;
                // ── 10. Stream text chunks ─────────────────────────
                yield {
                  type: "text",
                  content: chunk.content,
                  sessionId: session.id,
                };
              }
              break;

            case "tool_calls":
              if (chunk.toolCalls) {
                pendingToolCalls = chunk.toolCalls;
              }
              break;

            case "done":
              if (chunk.usage) {
                totalPromptTokens += chunk.usage.prompt_tokens;
                totalCompletionTokens += chunk.usage.completion_tokens;
              }
              break;

            case "error":
              yield {
                type: "error",
                content: chunk.content ?? "LLM inference error",
              };
              return;
          }
        }

        // If no tool calls, the turn is complete
        if (pendingToolCalls.length === 0) {
          break;
        }

        // ── Tool Use Loop ──────────────────────────────────────────
        // Append the assistant message with tool calls to context
        llmMessages.push({
          role: "assistant",
          content: chunkText || null,
          tool_calls: pendingToolCalls,
        });

        // Notify user about tool execution
        const toolNames = pendingToolCalls
          .map((tc) => tc.function.name)
          .join(", ");
        yield {
          type: "tool_progress",
          content: `Executing: ${toolNames}`,
          tools: pendingToolCalls.map((tc) => ({
            name: tc.function.name,
            id: tc.id,
          })),
        };

        // Execute all tool calls
        const toolResults = await executeToolCalls(
          toolkit,
          pendingToolCalls,
          agentType
        );

        // Append tool results to messages
        for (const result of toolResults) {
          llmMessages.push({
            role: "tool",
            tool_call_id: result.callId,
            content: result.result,
          });
        }

        // Clear chunk text for next iteration
        chunkText = "";
        // Loop back to get the LLM's response with tool results
      }

      if (loopCount >= MAX_TOOL_LOOPS) {
        yield {
          type: "error",
          content:
            "Reached maximum tool execution depth. Please try a simpler request.",
        };
      }

      // ── 11. Record agent message + meter ───────────────────────────
      const tokenCount = totalPromptTokens + totalCompletionTokens;

      await prisma.agentMessage.create({
        data: {
          sessionId: session.id,
          role: "AGENT",
          content: fullResponse,
          tokenCount,
          toolCalls:
            loopCount > 1
              ? JSON.parse(JSON.stringify(
                  llmMessages
                    .filter((m) => m.role === "assistant" && m.tool_calls)
                    .map((m) => m.tool_calls)
                ))
              : undefined,
        },
      });

      // Meter the agent call for billing
      await this.meterAgentCall(orgId, tokenCount);

      // ── 12. Post-turn: evaluate context graph updates ──────────────
      // Run asynchronously — don't block the response
      evaluateContextUpdates(
        prisma,
        orgId,
        agentType,
        message,
        fullResponse
      ).catch((err) =>
        console.error("Context evaluation error:", err)
      );

      yield {
        type: "done",
        content: "",
        sessionId: session.id,
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
        },
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      console.error("AgentExecutor error:", err);
      yield { type: "error", content: `Agent error: ${errorMessage}` };
    }
  }

  // ── Session Management ─────────────────────────────────────────────────

  private async getOrCreateSession(
    orgId: string,
    agentType: AgentType,
    surface: SurfaceType,
    userId?: string,
    existingSessionId?: string
  ) {
    // Try to reuse an existing session
    if (existingSessionId) {
      const existing = await prisma.agentSession.findUnique({
        where: { id: existingSessionId },
      });
      if (existing && !existing.endedAt && existing.agentType === agentType) {
        return existing;
      }
    }

    // Find an active session for this org/agent/user combo
    const recent = await prisma.agentSession.findFirst({
      where: {
        organizationId: orgId,
        agentType,
        userId: userId ?? undefined,
        endedAt: null,
        // Only reuse sessions from the last 30 minutes
        startedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      orderBy: { startedAt: "desc" },
    });

    if (recent) return recent;

    // Create a new session
    return prisma.agentSession.create({
      data: {
        organizationId: orgId,
        agentType,
        surface,
        userId: userId ?? null,
      },
    });
  }

  // ── History Loading ────────────────────────────────────────────────────

  private async loadHistory(
    sessionId: string
  ): Promise<{ role: string; content: string }[]> {
    const messages = await prisma.agentMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: HISTORY_LIMIT,
      select: { role: true, content: true },
    });

    return messages.map((m) => ({
      role: m.role === "USER" ? "user" : m.role === "AGENT" ? "assistant" : "system",
      content: m.content,
    }));
  }

  // ── LLM Message Building ──────────────────────────────────────────────

  private buildLLMMessages(
    systemPrompt: string,
    contextBlock: string,
    history: { role: string; content: string }[],
    userMessage: string
  ): LLMMessage[] {
    const messages: LLMMessage[] = [];

    // System prompt with context
    let fullSystemPrompt = systemPrompt;
    if (contextBlock) {
      fullSystemPrompt += `\n\n${contextBlock}`;
    }
    messages.push({ role: "system", content: fullSystemPrompt });

    // Conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    }

    // Current user message
    messages.push({ role: "user", content: userMessage });

    return messages;
  }

  // ── Agent Definition Lookup ────────────────────────────────────────────

  private getAgentDefinition(agentType: AgentType) {
    switch (agentType) {
      case "ONBOARDING":
        return ONBOARDING_AGENT;
      case "TASKS":
        return TASKS_AGENT;
      case "PROJECTS":
        return PROJECTS_AGENT;
      case "BRIEFS":
        return BRIEFS_AGENT;
      case "ORDERS":
        return ORDERS_AGENT;
      default:
        return TASKS_AGENT;
    }
  }

  // ── Tool Definitions Lookup ────────────────────────────────────────────

  private getToolsForAgent(agentType: AgentType): LLMTool[] {
    switch (agentType) {
      case "ONBOARDING":
        return ONBOARDING_TOOLS;
      case "TASKS":
        return TASKS_TOOLS;
      case "PROJECTS":
        return PROJECTS_TOOLS;
      case "BRIEFS":
        return BRIEFS_TOOLS;
      case "ORDERS":
        return ORDERS_TOOLS;
      default:
        return CONTEXT_TOOLS;
    }
  }

  // ── Billing Metering ──────────────────────────────────────────────────

  private async meterAgentCall(
    orgId: string,
    tokenCount: number
  ): Promise<void> {
    try {
      const billing = await prisma.billingAccount.findUnique({
        where: { organizationId: orgId },
      });

      if (!billing) return;

      await prisma.billingMeterEvent.create({
        data: {
          billingAccountId: billing.id,
          eventType: "AGENT_CALL",
          quantity: 1,
          metadata: { tokenCount },
        },
      });
    } catch (err) {
      // Non-critical — don't fail the response
      console.error("Metering error:", err);
    }
  }
}
