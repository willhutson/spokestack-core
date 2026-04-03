import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, unauthorized, error } from "@/lib/api";
import { updateCanvasFromAgentAction } from "@/lib/mission-control/canvas-updater";

/**
 * POST /api/v1/agents/ask
 * One-shot agent query (no streaming). Returns full response.
 *
 * Tries `agent-builder-client` first, falls back to direct fetch.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { message, surface, agentType } = body;

  if (!message) return error("message is required");

  const payload = {
    message,
    orgId: auth.organizationId,
    userId: auth.user.id,
    surface: surface ?? "CLI",
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
  try {
    const { executeAgent } = await import(
      "@/lib/mission-control/agent-builder-client"
    );

    const result = await executeAgent({
      agentType: (payload.metadata.agentType ?? "general") as import("@/lib/agents/types").AgentType,
      prompt: payload.message,
      organizationId: payload.orgId,
      userId: payload.userId,
      context: payload.metadata as Record<string, unknown>,
      stream: false,
    });

    // Fire-and-forget: update Mission Control canvas
    updateCanvasFromAgentAction(auth.organizationId, result as unknown as Record<string, unknown>).catch(() => {});

    return json(result);
  } catch {
    // agent-builder-client not available — fall back to direct fetch
  }

  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const runtimeSecret = process.env.AGENT_RUNTIME_SECRET;

  if (!runtimeUrl || !runtimeSecret) {
    return error("Agent runtime not configured", 503);
  }

  const runtimeResponse = await fetch(`${runtimeUrl}/api/v1/core/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Agent-Secret": runtimeSecret,
    },
    body: JSON.stringify({
      agent_type: payload.metadata?.agentType ?? "assistant",
      task: payload.message,
      org_id: auth.organizationId,
      user_id: auth.user.id,
      stream: false,
    }),
  });

  if (!runtimeResponse.ok) {
    return error("Agent runtime error", runtimeResponse.status);
  }

  const data = await runtimeResponse.json();

  // Fire-and-forget: update Mission Control canvas
  updateCanvasFromAgentAction(auth.organizationId, data).catch(() => {});

  return json(data);
}
