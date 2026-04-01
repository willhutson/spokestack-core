import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

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

  const agentType = session.agentType;

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
        const agentBuilderUrl = process.env.AGENT_BUILDER_URL;

        if (agentBuilderUrl) {
          fullResponse = await streamFromAgentBuilder(
            controller,
            sseEvent,
            agentBuilderUrl,
            content,
            chatId,
            agentType,
            auth.organizationId,
            auth.user.id
          );
        } else {
          // No agent builder configured
          fullResponse =
            "The agent runtime is not connected yet. Set AGENT_BUILDER_URL in your environment to enable AI chat.";
          controller.enqueue(sseEvent("chunk", { text: fullResponse }));
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
// Agent builder streaming helper
// ---------------------------------------------------------------------------

async function streamFromAgentBuilder(
  controller: ReadableStreamDefaultController,
  sseEvent: (event: string, data: unknown) => Uint8Array,
  agentBuilderUrl: string,
  message: string,
  chatId: string,
  agentType: string,
  organizationId: string,
  userId: string
): Promise<string> {
  const agentBuilderApiKey = process.env.AGENT_BUILDER_API_KEY;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Organization-Id": organizationId,
    "X-User-Id": userId,
  };
  if (agentBuilderApiKey) {
    headers["X-API-Key"] = agentBuilderApiKey;
  }

  const res = await fetch(`${agentBuilderUrl}/api/v1/agent/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agentType,
      message,
      chatId,
      stream: true,
      context: {
        organizationId,
        userId,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Agent builder error: ${res.status}`);
  }

  if (!res.body) {
    // Non-streaming JSON response
    const data = await res.json();
    const text = data.content || data.text || data.message || "";
    controller.enqueue(sseEvent("chunk", { text }));
    return text;
  }

  // Parse SSE stream from agent builder
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

      if (!trimmed || trimmed.startsWith(":")) continue;

      if (trimmed.startsWith("data: ")) {
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);

          // Forward work events (work_start, entity_created, work_complete)
          if (parsed.type === "work_start" || parsed.type === "entity_created" || parsed.type === "work_complete") {
            controller.enqueue(sseEvent(parsed.type, parsed));
            continue;
          }

          // Extract text from flexible format
          const text = parsed.delta || parsed.text || parsed.content || parsed.data?.content;
          if (text) {
            full += text;
            controller.enqueue(sseEvent("chunk", { text }));
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  return full;
}
