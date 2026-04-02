import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

interface RouteContext {
  params: Promise<{ chatId: string }>;
}

/**
 * GET /api/v1/mission-control/chats/[chatId]
 * Single session with messages included.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { chatId } = await ctx.params;

  const chat = await prisma.agentSession.findFirst({
    where: {
      id: chatId,
      organizationId: auth.organizationId,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!chat) return error("Chat not found", 404);

  const meta = chat.metadata as Record<string, unknown> | null;
  const enriched = {
    ...chat,
    agentType: meta?.mcAgentType ?? chat.agentType,
    title: meta?.title ?? `${chat.agentType} Chat`,
    status: chat.endedAt ? "archived" : "active",
    agentStatus: "idle",
  };

  return json(enriched);
}

/**
 * PATCH /api/v1/mission-control/chats/[chatId]
 * Update metadata (title, status changes).
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { chatId } = await ctx.params;
  const body = await req.json();
  const { title, status } = body;

  const existing = await prisma.agentSession.findFirst({
    where: { id: chatId, organizationId: auth.organizationId },
  });

  if (!existing) return error("Chat not found", 404);

  const currentMeta =
    (existing.metadata as Record<string, unknown> | null) ?? {};
  const updatedMeta = { ...currentMeta };
  if (title !== undefined) updatedMeta.title = title;
  if (status !== undefined) updatedMeta.status = status;

  const chat = await prisma.agentSession.update({
    where: { id: chatId },
    data: { metadata: updatedMeta as any },
  });

  return json({ chat });
}

/**
 * DELETE /api/v1/mission-control/chats/[chatId]
 * Soft archive — set endedAt to now.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { chatId } = await ctx.params;

  const existing = await prisma.agentSession.findFirst({
    where: { id: chatId, organizationId: auth.organizationId },
  });

  if (!existing) return error("Chat not found", 404);

  await prisma.agentSession.update({
    where: { id: chatId },
    data: { endedAt: new Date() },
  });

  return json({ message: "Chat archived" });
}
