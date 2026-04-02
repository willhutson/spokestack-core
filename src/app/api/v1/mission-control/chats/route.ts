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

  // Enrich with MC agent type from metadata
  const enriched = chats.map((c) => ({
    ...c,
    agentType: (c.metadata as Record<string, unknown>)?.mcAgentType ?? c.agentType,
    title: (c.metadata as Record<string, unknown>)?.title ?? `${c.agentType} Chat`,
    status: c.endedAt ? "archived" : "active",
    agentStatus: "idle",
  }));

  return json({ chats: enriched });
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

  // MC sends agent types like "assistant", "brief_writer", "analyst" etc.
  // But Prisma AgentType enum only has: ONBOARDING, TASKS, PROJECTS, BRIEFS, ORDERS, MODULE
  // Map MC types to the closest Prisma enum value, store the full type in metadata
  const PRISMA_AGENT_MAP: Record<string, string> = {
    onboarding: "ONBOARDING",
    "core_onboarding": "ONBOARDING",
    tasks: "TASKS",
    projects: "PROJECTS",
    briefs: "BRIEFS",
    brief_writer: "BRIEFS",
    orders: "ORDERS",
  };
  const prismaAgentType = PRISMA_AGENT_MAP[agentType] ?? "MODULE";

  const metadata: Record<string, unknown> = { mcAgentType: agentType };
  if (title) metadata.title = title;

  const chat = await prisma.agentSession.create({
    data: {
      organizationId: auth.organizationId,
      userId: auth.user.id,
      agentType: prismaAgentType as any,
      surface: "WEB",
      metadata: metadata as any,
    },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return json({ chat }, 201);
}
