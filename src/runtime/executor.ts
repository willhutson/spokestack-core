import { AgentType, SurfaceType } from "@prisma/client";

export interface AgentStreamChunk {
  type: "text" | "tool_progress" | "error";
  content: string;
  tools?: unknown[];
}

interface ExecuteTurnParams {
  sessionId?: string;
  message: string;
  orgId: string;
  userId?: string;
  surface: string;
  agentType: AgentType;
}

/**
 * Agent Executor — the core loop that runs an agent conversation turn.
 *
 * This is the skeleton implementation. Full LLM integration
 * (OpenRouter, tool execution loop, context graph reads/writes)
 * will be built in Weeks 2-3.
 */
export class AgentExecutor {
  async *executeTurn(
    params: ExecuteTurnParams
  ): AsyncGenerator<AgentStreamChunk> {
    const { message, orgId, agentType } = params;

    // TODO: Week 2-3 implementation:
    // 1. Load or create session (AgentSession)
    // 2. Build agent config (tier-scoped tools + system prompt)
    // 3. Load conversation history
    // 4. Load relevant context graph entries
    // 5. Check rate limit (Redis sliding window)
    // 6. Record user message (AgentMessage)
    // 7. Build LLM request (OpenRouter)
    // 8. Execute LLM call with streaming + tool use loop
    // 9. Stream response chunks
    // 10. Record agent message + meter the call
    // 11. Evaluate context graph updates

    // Skeleton: echo back with agent type info
    yield {
      type: "text",
      content: `[${agentType} Agent] I received your message: "${message}". `,
    };

    yield {
      type: "text",
      content: `I'm the ${agentType} Agent for organization ${orgId}. `,
    };

    yield {
      type: "text",
      content:
        "Full LLM integration coming in Week 2. For now, I'm confirming the runtime is wired up correctly.",
    };
  }
}
