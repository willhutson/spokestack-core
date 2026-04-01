import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, unauthorized, error } from "@/lib/api";
import { updateCanvasFromAgentAction } from "@/lib/mission-control/canvas-updater";

/**
 * POST /api/v1/agents/ask
 * One-shot agent query (no streaming). Returns full response.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { message, surface } = body;

  if (!message) return error("message is required");

  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const runtimeSecret = process.env.AGENT_RUNTIME_SECRET;

  if (!runtimeUrl || !runtimeSecret) {
    return error("Agent runtime not configured", 503);
  }

  const runtimeResponse = await fetch(`${runtimeUrl}/agent/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Agent-Secret": runtimeSecret,
    },
    body: JSON.stringify({
      message,
      orgId: auth.organizationId,
      userId: auth.user.id,
      surface: surface ?? "CLI",
      metadata: {
        instructions:
          "CRITICAL: Only call create_task, create_project, or create_brief ONCE per user request. " +
          "If the entity was already created in this session and you need to add more details, " +
          "use update_task, update_project, or update_brief instead. " +
          "Never create duplicate entities.",
      },
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
