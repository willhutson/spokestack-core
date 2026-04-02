import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { unauthorized, error } from "@/lib/api";
import { detectCorrection } from "@/lib/context/correction-detector";
import { updateCanvasFromAgentAction } from "@/lib/mission-control/canvas-updater";

/**
 * POST /api/v1/agents/chat
 * Proxy to agent runtime for conversational agent interaction (SSE).
 *
 * Tries `agent-builder-client` first (new MC architecture), falls back
 * to direct fetch against AGENT_RUNTIME_URL.
 *
 * Phase 3 additions:
 * - Correction detection: if the user's message corrects the agent,
 *   write a PREFERENCE ContextEntry so the agent won't repeat the mistake.
 * - Handoff passthrough: SSE events with type "handoff" are forwarded
 *   verbatim to the client for the HandoffPrompt component.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { message, sessionId, surface, agentType, messages: chatHistory } = body;

  if (!message) return error("message is required");

  // ── Correction Detection ─────────────────────────────────────────
  if (chatHistory && Array.isArray(chatHistory)) {
    const lastAssistantMessage = chatHistory
      .slice()
      .reverse()
      .find(
        (m: { role: string; content: string }) => m.role === "assistant" || m.role === "agent"
      )?.content;

    if (lastAssistantMessage && message) {
      const correction = detectCorrection(message, lastAssistantMessage);
      if (
        correction.isCorrection &&
        correction.preferenceKey &&
        correction.preferenceValue
      ) {
        prisma.contextEntry
          .create({
            data: {
              organizationId: auth.organizationId,
              entryType: "PREFERENCE",
              category: "agent.correction",
              key: correction.preferenceKey,
              value: correction.preferenceValue,
              confidence: 0.9,
              expiresAt: new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000
              ),
            },
          })
          .catch((err) =>
            console.error(
              "[correction-detector] failed to write entry:",
              err
            )
          );
      }
    }
  }

  // ── Build payload shared by both paths ──────────────────────────
  const payload = {
    message,
    sessionId,
    orgId: auth.organizationId,
    userId: auth.user.id,
    surface: surface ?? "WEB",
    metadata: {
      agentType: agentType ?? "general",
      instructions:
        "CRITICAL: Only call create_task, create_project, or create_brief ONCE per user request. " +
        "If the entity was already created in this session and you need to add more details, " +
        "use update_task, update_project, or update_brief instead. " +
        "Never create duplicate entities.",
    },
  };

  // ── Try agent-builder-client, fall back to direct fetch ─────────
  // Strategy: use builder client's streaming execution when available,
  // collecting chunks into an SSE stream we control. Otherwise, proxy
  // the raw SSE from AGENT_RUNTIME_URL.

  let usedBuilderClient = false;

  try {
    const { executeAgentStream } = await import(
      "@/lib/mission-control/agent-builder-client"
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await executeAgentStream(
            {
              agentType: (payload.metadata.agentType ?? "general") as import("@/lib/agents/types").AgentType,
              prompt: payload.message,
              organizationId: payload.orgId,
              userId: payload.userId,
              sessionId: payload.sessionId,
              context: payload.metadata as Record<string, unknown>,
              stream: true,
            },
            (chunk, event) => {
              controller.enqueue(
                encoder.encode(
                  `event: ${event}\ndata: ${JSON.stringify({ text: chunk })}\n\n`
                )
              );
            }
          );
          controller.enqueue(
            encoder.encode(`event: done\ndata: {}\n\n`)
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Stream failed";
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    usedBuilderClient = true;

    // Fire-and-forget: update Mission Control canvas after agent interaction
    updateCanvasFromAgentAction(auth.organizationId, {}).catch(() => {});

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    // agent-builder-client not available — fall back to direct fetch
  }

  if (!usedBuilderClient) {
    const runtimeUrl = process.env.AGENT_RUNTIME_URL;
    const runtimeSecret = process.env.AGENT_RUNTIME_SECRET;

    if (!runtimeUrl || !runtimeSecret) {
      return error("Agent runtime not configured", 503);
    }

    const runtimeResponse = await fetch(`${runtimeUrl}/agent/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": runtimeSecret,
      },
      body: JSON.stringify(payload),
    });

    if (!runtimeResponse.ok) {
      return error("Agent runtime error", runtimeResponse.status);
    }

    // Fire-and-forget: update Mission Control canvas after agent interaction
    updateCanvasFromAgentAction(auth.organizationId, {}).catch(() => {});

    // Forward the SSE stream verbatim — this passes through all event types
    // including text, tool_progress, handoff, and done events
    return new Response(runtimeResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  return error("Agent runtime not configured", 503);
}
