import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/mission-control/notifications
 * List notifications for the authenticated org+user with unread count.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    userId: auth.user.id,
  };
  if (unreadOnly) where.read = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: {
        organizationId: auth.organizationId,
        userId: auth.user.id,
        read: false,
      },
    }),
  ]);

  return json({ notifications, unreadCount });
}

/**
 * PATCH /api/v1/mission-control/notifications
 * Mark all notifications as read.
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: {
        organizationId: auth.organizationId,
        userId: auth.user.id,
        read: false,
      },
      data: { read: true },
    });
    return json({ message: "All notifications marked as read" });
  }

  return json({ message: "No action taken" });
}
