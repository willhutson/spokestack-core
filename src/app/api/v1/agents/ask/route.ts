import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, unauthorized, error } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/v1/agents/ask
 * One-shot agent query (no streaming). Returns full response.
 * Proxies to ongoing-agent-builder's /api/v1/core/execute endpoint.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { message, surface, agentType: requestedAgent } = body;

  if (!message) return error("message is required");

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

  let runtimeResponse: Response;
  try {
    runtimeResponse = await fetch(`${runtimeUrl}/api/v1/core/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": runtimeSecret,
      },
      body: JSON.stringify({
        task: message,
        agent_type: requestedAgent?.toUpperCase(),
        org_id: auth.organizationId,
        org_name: orgName,
        org_tier: orgTier,
        user_id: auth.user.id,
        surface: surface || "WEB",
        stream: false,
      }),
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

  if (result.status === "gated") {
    return json({
      type: "upgrade",
      content: result.upgrade_message,
      // CLI-compatible fields
      response: result.upgrade_message,
      agentType: requestedAgent || "tasks",
      upgradeRequired: true,
      requiredTier: result.required_tier,
      message: result.upgrade_message,
    }, 403);
  }

  const responseText = result.output ?? "I'm not sure how to help with that.";

  return json({
    // Web-compatible fields
    type: "text",
    content: responseText,
    // CLI-compatible fields
    response: responseText,
    agentType: requestedAgent || "tasks",
    actions: result.actions || [],
  });
}
