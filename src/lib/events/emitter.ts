import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import { processEvent } from "./processor";

/**
 * Emit an entity event. Creates the EntityEvent record and kicks off
 * asynchronous handler processing (fire-and-forget).
 */
export async function emitEvent(
  organizationId: string,
  entityType: string,
  entityId: string,
  action: string,
  metadata?: Record<string, unknown>,
  userId?: string
) {
  const event = await prisma.entityEvent.create({
    data: {
      organizationId,
      entityType,
      entityId,
      action,
      userId,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  // Fire-and-forget: process handlers in the background
  processEvent(event.id).catch(() => {});

  return event;
}
