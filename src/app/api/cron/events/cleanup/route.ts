import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/cron/events/cleanup
 * Vercel Cron handler. Deletes processed EntityEvents older than 30 days.
 * Schedule: Sundays at 03:00 UTC (configured in vercel.json)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Delete handler logs for old processed events first
  const logsDeleted = await prisma.eventHandlerLog.deleteMany({
    where: {
      event: {
        processedAt: { not: null },
        createdAt: { lt: thirtyDaysAgo },
      },
    },
  });

  // Delete old processed events
  const eventsDeleted = await prisma.entityEvent.deleteMany({
    where: {
      processedAt: { not: null },
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  return NextResponse.json({
    eventsDeleted: eventsDeleted.count,
    logsDeleted: logsDeleted.count,
    cutoffDate: thirtyDaysAgo.toISOString(),
    completedAt: new Date().toISOString(),
  });
}
