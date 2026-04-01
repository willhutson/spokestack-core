import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/mission-control/activity
 * Returns recent agent actions as a timeline.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const messages = await prisma.agentMessage.findMany({
    where: {
      session: { organizationId: auth.organizationId },
      role: "AGENT",
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      id: true,
      content: true,
      toolCalls: true,
      createdAt: true,
      session: {
        select: { agentType: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const activity = messages.map((msg) => {
    // Extract action from tool calls if available
    const tools = msg.toolCalls as Array<{
      function?: { name?: string };
    }> | null;
    const toolNames = tools
      ?.map((tc) => tc.function?.name)
      .filter(Boolean) ?? [];

    const action = toolNames.length > 0
      ? toolNames.join(", ")
      : summarizeContent(msg.content);

    return {
      id: msg.id,
      agentType: msg.session.agentType,
      action,
      content: msg.content.slice(0, 200),
      toolCalls: toolNames,
      timestamp: msg.createdAt.toISOString(),
    };
  });

  return json({ activity });
}

function summarizeContent(content: string): string {
  const first = content.split(/[.!?\n]/)[0]?.trim();
  if (!first) return "responded";
  if (first.length > 60) return first.slice(0, 57) + "...";
  return first;
}
