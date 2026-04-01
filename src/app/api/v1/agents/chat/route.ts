import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { unauthorized, error } from "@/lib/api";
import { detectCorrection } from "@/lib/context/correction-detector";
import { updateCanvasFromAgentAction } from "@/lib/mission-control/canvas-updater";

/**
 * POST /api/v1/agents/chat
 * Proxy to Railway Agent Runtime for conversational agent interaction (SSE).
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
  const { message, sessionId, surface, messages: chatHistory } = body;

  if (!message) return error("message is required");

  // ── Correction Detection ─────────────────────────────────────────
  // Check if the user is correcting the agent based on the last message pair
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
        // Fire-and-forget: write PREFERENCE entry
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

  // ── Proxy to Agent Runtime ───────────────────────────────────────
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
    body: JSON.stringify({
      message,
      sessionId,
      orgId: auth.organizationId,
      userId: auth.user.id,
      surface: surface ?? "WEB",
    }),
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
