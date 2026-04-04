import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const subscriptions = await prisma.eventSubscription.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return json({ webhooks: subscriptions });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { entityType, action, handler, config, priority } = body;

  if (!entityType || !action || !handler) {
    return error("entityType, action, and handler are required");
  }

  const subscription = await prisma.eventSubscription.create({
    data: {
      organizationId: auth.organizationId,
      entityType,
      action,
      handler,
      config: config || null,
      priority: priority ?? 100,
    },
  });

  return json({ webhook: subscription });
}
