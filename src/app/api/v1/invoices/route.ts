import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/invoices
 * List invoices for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as
    | "DRAFT"
    | "SENT"
    | "PAID"
    | "OVERDUE"
    | "VOID"
    | null;

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(status ? { status } : {}),
    },
    include: { client: true, items: true, order: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({ invoices });
}
