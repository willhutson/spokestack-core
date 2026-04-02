import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { getAgentSystemPrompt } from "@/lib/mission-control/onboarding-agent-prompt";

interface RouteContext {
  params: Promise<{ chatId: string }>;
}

/**
 * GET /api/v1/mission-control/chats/[chatId]/messages
 * List messages for a session with cursor-based pagination.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { chatId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  // Verify ownership
  const session = await prisma.agentSession.findFirst({
    where: { id: chatId, organizationId: auth.organizationId },
  });
  if (!session) return error("Chat not found", 404);

  const messages = await prisma.agentMessage.findMany({
    where: { sessionId: chatId },
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  const nextCursor = hasMore ? messages[messages.length - 1]?.id : null;

  return json({ messages, nextCursor, hasMore });
}

/**
 * POST /api/v1/mission-control/chats/[chatId]/messages
 * Send a message and stream the agent response via SSE.
 *
 * Uses agent-builder-client when available, otherwise falls back to
 * direct agent runtime fetch or OpenAI.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { chatId } = await ctx.params;
  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string") {
    return error("content is required");
  }

  // Verify ownership and get session info
  const session = await prisma.agentSession.findFirst({
    where: { id: chatId, organizationId: auth.organizationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) return error("Chat not found", 404);

  // Save user message
  const userMessage = await prisma.agentMessage.create({
    data: {
      sessionId: chatId,
      userId: auth.user.id,
      role: "USER",
      content,
    },
  });

  // ── Determine agent type ────────────────────────────────────────
  let agentType = session.agentType;

  // Try mc-router classification if available
  try {
    const { classifyGeneralMC } = await import(
      "@/lib/mission-control/mc-router"
    );
    const decision = classifyGeneralMC(content);
    if (decision && decision.confidence > 0.5) {
      agentType = decision.selectedAgent as typeof agentType;
    }
  } catch {
    // mc-router not available — use session agentType as-is
  }

  const systemPrompt = getAgentSystemPrompt(agentType);

  // Build conversation history for the LLM
  const history = [
    ...session.messages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user" as const, content },
  ];

  const encoder = new TextEncoder();

  function sseEvent(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        sseEvent("start", { messageId: userMessage.id, agentType })
      );

      let fullResponse = "";

      try {
        // Priority 1: agent-builder-client
        let usedClient = false;
        try {
          const { executeAgentStream } = await import(
            "@/lib/mission-control/agent-builder-client"
          );
          fullResponse = await streamFromBuilderClient(
            controller,
            sseEvent,
            executeAgentStream,
            systemPrompt,
            history,
            agentType as import("@/lib/agents/types").AgentType,
            auth.organizationId
          );
          usedClient = true;
        } catch {
          // agent-builder-client not available — continue to fallbacks
        }

        if (!usedClient) {
          if (process.env.AGENT_RUNTIME_URL) {
            // Priority 2: direct agent runtime
            fullResponse = await streamFromAgentRuntime(
              controller,
              sseEvent,
              systemPrompt,
              history,
              agentType,
              auth.organizationId
            );
          } else if (process.env.OPENAI_API_KEY) {
            // Priority 3: direct OpenAI call
            fullResponse = await streamFromOpenAI(
              controller,
              sseEvent,
              systemPrompt,
              history
            );
          } else {
            fullResponse =
              "I'm not connected to an AI backend yet. Please configure AGENT_RUNTIME_URL or OPENAI_API_KEY.";
            controller.enqueue(sseEvent("chunk", { text: fullResponse }));
          }
        }

        // Save agent message
        const agentMessage = await prisma.agentMessage.create({
          data: {
            sessionId: chatId,
            role: "AGENT",
            content: fullResponse,
          },
        });

        controller.enqueue(
          sseEvent("complete", {
            messageId: agentMessage.id,
            content: fullResponse,
          })
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Stream failed";
        controller.enqueue(sseEvent("error", { error: message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// Streaming helpers
// ---------------------------------------------------------------------------

async function streamFromBuilderClient(
  controller: ReadableStreamDefaultController,
  sseEvent: (event: string, data: unknown) => Uint8Array,
  executeAgentStream: typeof import("@/lib/mission-control/agent-builder-client").executeAgentStream,
  systemPrompt: string,
  history: { role: string; content: string }[],
  agentType: import("@/lib/agents/types").AgentType,
  organizationId: string
): Promise<string> {
  const lastUserMessage = history
    .slice()
    .reverse()
    .find((m) => m.role === "user")?.content ?? "";

  const result = await executeAgentStream(
    {
      agentType,
      prompt: lastUserMessage,
      systemPrompt,
      organizationId,
      context: { messages: history, agentType },
      stream: true,
    },
    (chunk, event) => {
      controller.enqueue(sseEvent("chunk", { text: chunk, event }));
    },
    (artifact) => {
      controller.enqueue(sseEvent("artifact", artifact));
    }
  );

  return result.content;
}

async function streamFromAgentRuntime(
  controller: ReadableStreamDefaultController,
  sseEvent: (event: string, data: unknown) => Uint8Array,
  systemPrompt: string,
  history: { role: string; content: string }[],
  agentType: string,
  organizationId: string
): Promise<string> {
  const res = await fetch(`${process.env.AGENT_RUNTIME_URL}/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      messages: history,
      agentType,
      organizationId,
      metadata: { agentType },
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Agent runtime error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    controller.enqueue(sseEvent("chunk", { text: chunk }));
  }

  return full;
}

async function streamFromOpenAI(
  controller: ReadableStreamDefaultController,
  sseEvent: (event: string, data: unknown) => Uint8Array,
  systemPrompt: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...history],
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`OpenAI error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") break;

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          controller.enqueue(sseEvent("chunk", { text: delta }));
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  return full;
}
