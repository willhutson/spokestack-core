import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { unauthorized, error } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/v1/agents/chat
 * Proxy to ongoing-agent-builder's /api/v1/core/execute endpoint.
 * Translates spokestack-core's request shape to agent-builder's expected format.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { message, context } = body;

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

  // Determine agent type from context hint
  let agentType: string | undefined;
  if (context === "onboarding") agentType = "ONBOARDING";

  const requestBody = {
    task: message,
    agent_type: agentType,
    org_id: auth.organizationId,
    org_name: orgName,
    org_tier: orgTier,
    user_id: auth.user.id,
    stream: false,
  };

  console.log("Agent request:", JSON.stringify(requestBody));

  // Proxy to ongoing-agent-builder /api/v1/core/execute
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

  let result: any;
  try {
    result = await runtimeResponse.json();
  } catch (parseErr) {
    console.error("Failed to parse agent response:", parseErr);
    return error("Invalid agent response", 502);
  }

  // If the agent is gated, return the upgrade message
  if (result.status === "gated") {
    return Response.json({
      type: "upgrade",
      content: result.upgrade_message,
    });
  }

  // Return agent response as SSE-like format for the frontend
  const responseText = result.output ?? "I'm not sure how to help with that.";
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
