import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/finance/revenue
 * Aggregate completed orders, grouped by client or project.
 * Supports ?groupBy=client|project (default "client").
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const groupBy = searchParams.get("groupBy") || "client";

  const orders = await prisma.order.findMany({
    where: {
      organizationId: auth.organizationId,
      status: "COMPLETED",
    },
    include: {
      client: { select: { id: true, name: true } },
    },
  });

  if (groupBy === "client") {
    const grouped: Record<string, { name: string; revenue: number; orderCount: number }> = {};
    for (const order of orders) {
      const key = order.clientId || "unknown";
      if (!grouped[key]) {
        grouped[key] = {
          name: order.client?.name || "Unknown Client",
          revenue: 0,
          orderCount: 0,
        };
      }
      grouped[key].revenue += order.totalCents;
      grouped[key].orderCount += 1;
    }
    const revenue = Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
    return json({ revenue });
  }

  // groupBy === "project" — group by notes/importSource as proxy
  const grouped: Record<string, { name: string; client: string; revenue: number; cost: number }> = {};
  for (const order of orders) {
    const key = order.importSource || order.notes || "General";
    if (!grouped[key]) {
      grouped[key] = {
        name: key,
        client: order.client?.name || "Unknown Client",
        revenue: 0,
        cost: 0,
      };
    }
    grouped[key].revenue += order.totalCents;
  }
  const revenue = Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
  return json({ revenue });
}
