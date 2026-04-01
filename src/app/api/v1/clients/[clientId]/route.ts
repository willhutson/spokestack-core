import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ clientId: string }>;
}

/**
 * GET /api/v1/clients/:clientId
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: auth.organizationId },
    include: {
      orders: { include: { items: true }, orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) return error("Client not found", 404);
  return json({ client });
}

/**
 * PATCH /api/v1/clients/:clientId
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { clientId } = await params;
  const body = await req.json();

  const existing = await prisma.client.findFirst({
    where: { id: clientId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Client not found", 404);

  const { name, email, phone, company, metadata } = body;

  const client = await prisma.client.update({
    where: { id: clientId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(company !== undefined ? { company } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    },
  });

  return json({ client });
}

/**
 * DELETE /api/v1/clients/:clientId
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { clientId } = await params;

  const existing = await prisma.client.findFirst({
    where: { id: clientId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Client not found", 404);

  await prisma.client.delete({ where: { id: clientId } });
  return json({ deleted: true });
}
