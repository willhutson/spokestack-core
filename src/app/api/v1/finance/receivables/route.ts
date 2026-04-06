import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/finance/receivables
 * Return outstanding invoices (SENT or OVERDUE) with computed daysOverdue.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: auth.organizationId,
      status: { in: ["SENT", "OVERDUE"] },
    },
    include: {
      client: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const today = new Date();

  const receivables = invoices.map((inv) => {
    const due = inv.dueDate ? new Date(inv.dueDate) : today;
    const diffMs = today.getTime() - due.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    return {
      id: inv.id,
      number: inv.number,
      clientId: inv.clientId,
      client: inv.client,
      status: inv.status,
      totalCents: inv.totalCents,
      currency: inv.currency,
      issuedAt: inv.issuedAt,
      dueDate: inv.dueDate,
      daysOverdue,
    };
  });

  return json({ receivables });
}
