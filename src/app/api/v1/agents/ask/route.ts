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
  const { message } = body;

  if (!message) return error("message is required");

  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const runtimeSecret = process.env.AGENT_RUNTIME_SECRET;

  if (!runtimeUrl || !runtimeSecret) {
    return error("Agent runtime not configured", 503);
  }

  // Fetch org details for agent-builder
  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    include: { billingAccount: true },
  });

  const orgTier = org?.billingAccount?.tier ?? "FREE";
  const orgName = org?.name ?? "";

  const runtimeResponse = await fetch(`${runtimeUrl}/api/v1/core/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Agent-Secret": runtimeSecret,
    },
    body: JSON.stringify({
      task: message,
      org_id: auth.organizationId,
      org_name: orgName,
      org_tier: orgTier,
      user_id: auth.user.id,
      stream: false,
    }),
  });

  if (!runtimeResponse.ok) {
    const errText = await runtimeResponse.text().catch(() => "Unknown error");
    console.error(`Agent runtime error ${runtimeResponse.status}: ${errText}`);
    return error("Agent runtime error", runtimeResponse.status);
  }

  const result = await runtimeResponse.json();

  if (result.status === "gated") {
    return json({ type: "upgrade", content: result.upgrade_message });
  }

  return json({ type: "text", content: result.output ?? "I'm not sure how to help with that." });
}
