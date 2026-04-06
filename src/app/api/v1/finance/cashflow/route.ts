import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/finance/cashflow
 * Aggregate orders by month, returning income and expenses.
 * Supports ?period=3|6|12 (months, default 12).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const period = Math.min(Math.max(parseInt(searchParams.get("period") || "12", 10) || 12, 1), 36);

  const since = new Date();
  since.setMonth(since.getMonth() - period);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      organizationId: auth.organizationId,
      createdAt: { gte: since },
    },
    select: {
      totalCents: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Build month buckets
  const buckets: Record<string, { income: number; expenses: number }> = {};
  const now = new Date();
  const cursor = new Date(since);
  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = { income: 0, expenses: 0 };
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const order of orders) {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets[key]) buckets[key] = { income: 0, expenses: 0 };

    if (order.status === "COMPLETED" || order.status === "CONFIRMED") {
      buckets[key].income += order.totalCents;
    } else if (order.status === "CANCELED") {
      buckets[key].expenses += order.totalCents;
    }
  }

  const cashflow = Object.entries(buckets).map(([month, data]) => ({
    month,
    income: data.income,
    expenses: data.expenses,
  }));

  return json({ cashflow });
}
