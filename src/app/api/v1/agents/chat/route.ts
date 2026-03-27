import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { unauthorized, error } from "@/lib/api";

/**
 * POST /api/v1/agents/chat
 * Proxy to Railway Agent Runtime for conversational agent interaction (SSE).
 * ModuleGuard is checked by the Agent Runtime based on the agent type.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { message, sessionId, surface } = body;

  if (!message) return error("message is required");

  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const runtimeSecret = process.env.AGENT_RUNTIME_SECRET;

  if (!runtimeUrl || !runtimeSecret) {
    return error("Agent runtime not configured", 503);
  }

  // Proxy to Railway Agent Runtime with SSE streaming
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

  // Forward the SSE stream
  return new Response(runtimeResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
