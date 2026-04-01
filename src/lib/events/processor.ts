import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";

const AGENT_BUILDER_URL = process.env.AGENT_BUILDER_URL ?? "http://localhost:4100";

/**
 * Process an EntityEvent by finding matching subscriptions and executing
 * their handlers. Creates EventHandlerLog records for each execution.
 */
export async function processEvent(eventId: string) {
  const event = await prisma.entityEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) return;

  // Find matching subscriptions: exact match or wildcard (*)
  const scopedSubscriptions = await prisma.eventSubscription.findMany({
    where: {
      enabled: true,
      AND: [
        {
          OR: [
            { entityType: event.entityType, action: event.action },
            { entityType: event.entityType, action: "*" },
            { entityType: "*", action: event.action },
            { entityType: "*", action: "*" },
          ],
        },
        {
          OR: [
            { organizationId: event.organizationId },
            { organizationId: null },
          ],
        },
      ],
    },
    orderBy: { priority: "asc" },
  });

  for (const sub of scopedSubscriptions) {
    const startMs = Date.now();
    let status: "SUCCESS" | "FAILED" = "SUCCESS";
    let result: Record<string, unknown> | null = null;
    let errorMsg: string | null = null;

    try {
      // Create log entry as RUNNING
      const log = await prisma.eventHandlerLog.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          subscriptionId: sub.id,
          status: "RUNNING",
        },
      });

      const handlerResult = await executeHandler(sub.handler, event);
      result = handlerResult;

      await prisma.eventHandlerLog.update({
        where: { id: log.id },
        data: {
          status: "SUCCESS",
          result: (result ?? undefined) as Prisma.InputJsonValue | undefined,
          durationMs: Date.now() - startMs,
        },
      });
    } catch (err) {
      status = "FAILED";
      errorMsg = err instanceof Error ? err.message : String(err);

      // Try to update the log; if the log creation itself failed, create one
      try {
        const existingLog = await prisma.eventHandlerLog.findFirst({
          where: {
            eventId: event.id,
            subscriptionId: sub.id,
            status: "RUNNING",
          },
        });
        if (existingLog) {
          await prisma.eventHandlerLog.update({
            where: { id: existingLog.id },
            data: {
              status: "FAILED",
              error: errorMsg,
              durationMs: Date.now() - startMs,
            },
          });
        } else {
          await prisma.eventHandlerLog.create({
            data: {
              organizationId: event.organizationId,
              eventId: event.id,
              subscriptionId: sub.id,
              status: "FAILED",
              error: errorMsg,
              durationMs: Date.now() - startMs,
            },
          });
        }
      } catch {
        // Best-effort logging; don't throw
      }
    }
  }

  // Mark event as processed
  await prisma.entityEvent.update({
    where: { id: eventId },
    data: { processedAt: new Date() },
  });
}

/**
 * Route a handler string to the appropriate execution logic.
 *
 * Handler formats:
 *   webhook:https://example.com/hook  → POST to the URL
 *   agent:agent-id-123                → POST to AGENT_BUILDER_URL
 *   module:CRM                        → log as queued (no-op for now)
 */
async function executeHandler(
  handler: string,
  event: {
    id: string;
    organizationId: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata: unknown;
    userId: string | null;
    createdAt: Date;
  }
): Promise<Record<string, unknown>> {
  const [type, ...rest] = handler.split(":");
  const value = rest.join(":"); // rejoin in case URL has colons

  const payload = {
    eventId: event.id,
    organizationId: event.organizationId,
    entityType: event.entityType,
    entityId: event.entityId,
    action: event.action,
    metadata: event.metadata,
    userId: event.userId,
    createdAt: event.createdAt.toISOString(),
  };

  switch (type) {
    case "webhook": {
      const res = await fetch(value, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { statusCode: res.status, body: await res.text() };
    }

    case "agent": {
      const url = `${AGENT_BUILDER_URL}/api/agents/${value}/trigger`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { statusCode: res.status, body: await res.text() };
    }

    case "module": {
      // Module handlers are queued for future processing
      return { status: "queued", moduleType: value };
    }

    default:
      throw new Error(`Unknown handler type: ${type}`);
  }
}
