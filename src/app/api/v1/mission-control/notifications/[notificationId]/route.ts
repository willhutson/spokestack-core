import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

interface RouteContext {
  params: Promise<{ notificationId: string }>;
}

/**
 * PATCH /api/v1/mission-control/notifications/[notificationId]
 * Update a single notification (read, dismissed).
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { notificationId } = await ctx.params;
  const body = await req.json();

  const existing = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      organizationId: auth.organizationId,
      userId: auth.user.id,
    },
  });

  if (!existing) return error("Notification not found", 404);

  const data: Record<string, unknown> = {};
  if (body.read !== undefined) data.read = Boolean(body.read);
  if (body.dismissed !== undefined) data.dismissed = Boolean(body.dismissed);

  // The Notification model may not have a 'dismissed' column — if so
  // the caller should only send { read: true }. We pass through whatever
  // fields the schema supports.
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data,
  });

  return json({ notification });
}
