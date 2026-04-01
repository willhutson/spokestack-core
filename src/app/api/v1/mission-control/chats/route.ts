import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/mission-control/chats
 * List AgentSession records for the authenticated org.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "active" | "archived"

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    userId: auth.user.id,
  };

  if (status === "archived") {
    where.endedAt = { not: null };
  } else if (status === "active") {
    where.endedAt = null;
  }

  const chats = await prisma.agentSession.findMany({
    where,
    include: {
      _count: { select: { messages: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return json({ chats });
}

/**
 * POST /api/v1/mission-control/chats
 * Create a new AgentSession.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { agentType, title } = body;

  if (!agentType) {
    return error("agentType is required");
  }

  const metadata: Record<string, unknown> = {};
  if (title) metadata.title = title;

  const chat = await prisma.agentSession.create({
    data: {
      organizationId: auth.organizationId,
      userId: auth.user.id,
      agentType,
      surface: "WEB",
      metadata: (Object.keys(metadata).length > 0 ? metadata : undefined) as any,
    },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return json({ chat }, 201);
}
