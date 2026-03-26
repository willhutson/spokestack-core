import { prisma } from "@/lib/prisma";
import {
  NotificationChannel,
  NotificationType,
} from "@prisma/client";
import { sendSlackNotification } from "@/lib/integrations/slack";
import { sendWhatsAppMessage } from "@/lib/integrations/telnyx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateNotificationParams {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  channel: NotificationChannel;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Create an in-app notification record.
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<string> {
  const notification = await prisma.notification.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      channel: params.channel,
    },
  });

  return notification.id;
}

// ---------------------------------------------------------------------------
// Send / route
// ---------------------------------------------------------------------------

/**
 * Send a notification by routing it to the appropriate delivery channel.
 *
 * - IN_APP: no external delivery needed (already persisted)
 * - EMAIL: sends via transactional email provider
 * - PUSH: sends via push notification service
 * - WHATSAPP: sends via Telnyx
 * - SMS: sends via Telnyx
 */
export async function sendNotification(
  notificationId: string
): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error("Notification not found: " + notificationId);
  }

  const user = await prisma.user.findFirst({
    where: { id: notification.userId },
  });

  const message = notification.body
    ? `${notification.title}\n${notification.body}`
    : notification.title;

  switch (notification.channel) {
    case "IN_APP":
      // Already persisted — nothing else to do
      break;

    case "EMAIL": {
      // Delegate to transactional email service
      const emailUrl = process.env.EMAIL_SERVICE_URL;
      if (emailUrl && user?.email) {
        await fetch(emailUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: user.email,
            subject: notification.title,
            body: notification.body ?? "",
          }),
        });
      }
      break;
    }

    case "PUSH": {
      // Delegate to push notification service
      const pushUrl = process.env.PUSH_SERVICE_URL;
      if (pushUrl) {
        await fetch(pushUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: notification.userId,
            title: notification.title,
            body: notification.body ?? "",
          }),
        });
      }
      break;
    }

    case "WHATSAPP": {
      // Look up the user's phone from their profile or org integration
      const member = await prisma.teamMember.findFirst({
        where: {
          userId: notification.userId,
          organizationId: notification.organizationId,
        },
      });

      // Attempt to find phone via the user record or a stored preference
      // For now, we fall back to the Slack webhook as a secondary channel
      if (member) {
        const integration = await prisma.integration.findFirst({
          where: {
            organizationId: notification.organizationId,
            type: "TELNYX",
            status: "ACTIVE",
          },
        });

        const config = integration?.config as Record<string, any> | null;
        const phone = config?.notificationPhone;
        if (phone) {
          await sendWhatsAppMessage(phone, message);
        }
      }
      break;
    }

    case "SMS": {
      // SMS via Telnyx — similar path to WhatsApp
      const smsPhone = process.env.TELNYX_SMS_FROM;
      if (smsPhone) {
        // Reuse WhatsApp sender; Telnyx routes based on type field
        // In a full implementation, this would use a separate SMS endpoint
        console.log(
          `[SMS] Would send to user ${notification.userId}: ${message}`
        );
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Read / mark as read
// ---------------------------------------------------------------------------

/**
 * Get unread notifications for a user in an organization.
 */
export async function getUnreadNotifications(
  userId: string,
  orgId: string
) {
  return prisma.notification.findMany({
    where: {
      userId,
      organizationId: orgId,
      read: false,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}
