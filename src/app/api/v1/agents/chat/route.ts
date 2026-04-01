import { updateCanvasFromAgentAction } from "@/lib/mission-control/canvas-updater";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { unauthorized, error } from "@/lib/api";
import { detectCorrection } from "@/lib/context/correction-detector";

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

  // Fetch org details for agent-builder
  let orgTier = "FREE";
  let orgName = "";
  try {
    const org = await prisma.organization.findUnique({
      where: { id: auth.organizationId },
      include: { billingAccount: true },
    });
    orgTier = org?.billingAccount?.tier ?? "FREE";
    orgName = org?.name ?? "";
  } catch (e) {
    console.error("Failed to fetch org:", e);
  }

  const requestBody = {
    task: message,
    org_id: auth.organizationId,
    org_name: orgName,
    org_tier: orgTier,
    user_id: auth.user.id,
    session_id: sessionId,
    surface: surface ?? "WEB",
    stream: false,
  };

  let runtimeResponse: Response;
  try {
    runtimeResponse = await fetch(`${runtimeUrl}/api/v1/core/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": runtimeSecret,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (fetchErr) {
    console.error("Failed to reach agent runtime:", fetchErr);
    return error("Cannot reach agent runtime", 503);
  }

  if (!runtimeResponse.ok) {
    const errText = await runtimeResponse.text().catch(() => "Unknown error");
    console.error(`Agent runtime error ${runtimeResponse.status}: ${errText}`);
    return error(`Agent runtime error: ${errText}`, runtimeResponse.status);
  }

  let result: Record<string, unknown>;
  try {
    result = await runtimeResponse.json();
  } catch (parseErr) {
    console.error("Failed to parse agent response:", parseErr);
    return error("Invalid agent response", 502);
  }

  // Handle gated responses
  if (result.status === "gated") {
    return Response.json({
      type: "upgrade",
      content: result.upgrade_message,
    });
  }

  // Handle handoff responses
  if (result.status === "handoff") {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "handoff", target_agent: result.target_agent, context_summary: result.context_summary, reason: result.reason })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  // Fire-and-forget: update Mission Control canvas
  updateCanvasFromAgentAction(auth.organizationId, result as Record<string, unknown>).catch(() => {});

  // Return agent response as SSE format
  const responseText = (result.output as string) ?? "I'm not sure how to help with that.";
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: responseText })}\n\n`));
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
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
