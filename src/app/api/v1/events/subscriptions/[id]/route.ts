import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/events/subscriptions/:id
 * Update an event subscription.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.eventSubscription.findFirst({
    where: { id, organizationId: auth.organizationId },
  });
  if (!existing) return error("Subscription not found", 404);

  const { entityType, action, handler, config, priority, enabled } = body;

  const subscription = await prisma.eventSubscription.update({
    where: { id },
    data: {
      ...(entityType !== undefined ? { entityType } : {}),
      ...(action !== undefined ? { action } : {}),
      ...(handler !== undefined ? { handler } : {}),
      ...(config !== undefined ? { config } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    },
  });

  return json({ subscription });
}

/**
 * DELETE /api/v1/events/subscriptions/:id
 * Delete an event subscription.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { id } = await params;

  const existing = await prisma.eventSubscription.findFirst({
    where: { id, organizationId: auth.organizationId },
  });
  if (!existing) return error("Subscription not found", 404);

  await prisma.eventSubscription.delete({ where: { id } });
  return json({ deleted: true });
}
