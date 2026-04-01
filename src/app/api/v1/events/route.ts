import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { emitEvent } from "@/lib/events/emitter";
import { json, error, unauthorized } from "@/lib/api";

/**
 * POST /api/v1/events
 * Create an event via emitEvent.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { entityType, entityId, action, metadata } = body;

  if (!entityType || !entityId || !action) {
    return error("entityType, entityId, and action are required");
  }

  const event = await emitEvent(
    auth.organizationId,
    entityType,
    entityId,
    action,
    metadata,
    auth.user.id
  );

  return json({ event }, 201);
}

/**
 * GET /api/v1/events
 * List events for the organization.
 * Query params: entityType, action, since (ISO date), limit (default 50)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const action = searchParams.get("action");
  const since = searchParams.get("since");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  const events = await prisma.entityEvent.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return json({ events });
}
