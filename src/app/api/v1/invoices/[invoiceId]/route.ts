import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ invoiceId: string }>;
}

/**
 * GET /api/v1/invoices/:invoiceId
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: auth.organizationId },
    include: { client: true, items: true, order: { include: { items: true } } },
  });

  if (!invoice) return error("Invoice not found", 404);
  return json({ invoice });
}

/**
 * PATCH /api/v1/invoices/:invoiceId
 * Update invoice status.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { invoiceId } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status) return error("status is required");

  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Invoice not found", 404);

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      ...(status === "PAID" ? { paidAt: new Date() } : {}),
      ...(status === "SENT" && !existing.issuedAt ? { issuedAt: new Date() } : {}),
    },
    include: { client: true, items: true },
  });

  return json({ invoice });
}
