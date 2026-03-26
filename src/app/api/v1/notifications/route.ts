import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/notifications
 * List notifications for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      organizationId: auth.organizationId,
      userId: auth.user.id,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      organizationId: auth.organizationId,
      userId: auth.user.id,
      read: false,
    },
  });

  return json({ notifications, unreadCount });
}

/**
 * PATCH /api/v1/notifications
 * Mark notifications as read.
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { notificationIds, markAllRead } = body;

  if (markAllRead) {
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

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return error("notificationIds array or markAllRead flag is required");
  }

  await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      organizationId: auth.organizationId,
      userId: auth.user.id,
    },
    data: { read: true },
  });

  return json({ message: "Notifications marked as read" });
}
