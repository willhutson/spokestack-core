import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * POST /api/v1/events/subscriptions
 * Create an event subscription.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { entityType, action, handler, moduleType, config, priority } = body;

  if (!entityType || !action || !handler) {
    return error("entityType, action, and handler are required");
  }

  const subscription = await prisma.eventSubscription.create({
    data: {
      organizationId: auth.organizationId,
      entityType,
      action,
      handler,
      moduleType,
      config,
      priority: priority ?? 100,
    },
  });

  return json({ subscription }, 201);
}

/**
 * GET /api/v1/events/subscriptions
 * List event subscriptions for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const subscriptions = await prisma.eventSubscription.findMany({
    where: {
      OR: [
        { organizationId: auth.organizationId },
        { organizationId: null },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return json({ subscriptions });
}
