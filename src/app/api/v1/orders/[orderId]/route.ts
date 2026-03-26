import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ orderId: string }>;
}

/**
 * GET /api/v1/orders/:orderId
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { orderId } = await params;

  const order = await prisma.order.findFirst({
    where: { id: orderId, organizationId: auth.organizationId },
    include: {
      customer: true,
      items: true,
      invoice: { include: { items: true } },
    },
  });

  if (!order) return error("Order not found", 404);
  return json({ order });
}

/**
 * PATCH /api/v1/orders/:orderId
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { orderId } = await params;
  const body = await req.json();

  const existing = await prisma.order.findFirst({
    where: { id: orderId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Order not found", 404);

  const { status, notes, customerId } = body;

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(customerId !== undefined ? { customerId } : {}),
    },
    include: { customer: true, items: true, invoice: true },
  });

  return json({ order });
}
