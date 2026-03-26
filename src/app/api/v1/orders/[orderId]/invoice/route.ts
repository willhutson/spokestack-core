import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ orderId: string }>;
}

/**
 * POST /api/v1/orders/:orderId/invoice
 * Generate an invoice from an order.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { orderId } = await params;
  const body = await req.json();
  const { dueDate } = body;

  const order = await prisma.order.findFirst({
    where: { id: orderId, organizationId: auth.organizationId },
    include: { items: true, invoice: true },
  });

  if (!order) return error("Order not found", 404);
  if (order.invoice) return error("Invoice already exists for this order", 409);

  // Generate a sequential invoice number
  const invoiceCount = await prisma.invoice.count({
    where: { organizationId: auth.organizationId },
  });
  const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: auth.organizationId,
      orderId: order.id,
      customerId: order.customerId,
      number: invoiceNumber,
      totalCents: order.totalCents,
      currency: order.currency,
      issuedAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      items: {
        create: order.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.totalCents,
        })),
      },
    },
    include: { items: true, customer: true },
  });

  return json({ invoice }, 201);
}
