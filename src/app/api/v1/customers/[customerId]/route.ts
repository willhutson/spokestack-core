import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ customerId: string }>;
}

/**
 * GET /api/v1/customers/:customerId
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { customerId } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: auth.organizationId },
    include: {
      orders: { include: { items: true }, orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) return error("Customer not found", 404);
  return json({ customer });
}

/**
 * PATCH /api/v1/customers/:customerId
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { customerId } = await params;
  const body = await req.json();

  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Customer not found", 404);

  const { name, email, phone, company, metadata } = body;

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(company !== undefined ? { company } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    },
  });

  return json({ customer });
}

/**
 * DELETE /api/v1/customers/:customerId
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { customerId } = await params;

  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Customer not found", 404);

  await prisma.customer.delete({ where: { id: customerId } });
  return json({ deleted: true });
}
