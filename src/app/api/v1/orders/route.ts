import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/orders
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const orders = await prisma.order.findMany({
    where: { organizationId: auth.organizationId },
    include: {
      customer: true,
      items: true,
      invoice: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({ orders });
}

/**
 * POST /api/v1/orders
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const body = await req.json();
  const { customerId, items, notes, currency } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return error("items array is required");
  }

  const totalCents = items.reduce(
    (sum: number, item: { unitPriceCents: number; quantity: number }) =>
      sum + item.unitPriceCents * item.quantity,
    0
  );

  const order = await prisma.order.create({
    data: {
      organizationId: auth.organizationId,
      customerId,
      notes,
      currency: currency ?? "USD",
      totalCents,
      items: {
        create: items.map(
          (item: {
            description: string;
            quantity?: number;
            unitPriceCents: number;
          }) => ({
            description: item.description,
            quantity: item.quantity ?? 1,
            unitPriceCents: item.unitPriceCents,
            totalCents: item.unitPriceCents * (item.quantity ?? 1),
          })
        ),
      },
    },
    include: { items: true, customer: true },
  });

  return json({ order }, 201);
}
