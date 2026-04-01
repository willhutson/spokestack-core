import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSynthesisForOrg } from "@/lib/context/synthesizer";

export const runtime = "nodejs";

/**
 * GET /api/cron/weekly-synthesis
 * Vercel Cron handler. Validates CRON_SECRET, iterates all active orgs,
 * and triggers synthesis for each.
 * Schedule: every Monday at 09:00 UTC (configured in vercel.json)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all orgs with recent context activity (active orgs)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeOrgIds = await prisma.contextEntry.groupBy({
    by: ["organizationId"],
    where: { createdAt: { gte: sevenDaysAgo } },
  });

  const results: Array<{
    orgId: string;
    insightsGenerated: number;
    error?: string;
  }> = [];

  for (const { organizationId } of activeOrgIds) {
    try {
      const count = await runSynthesisForOrg(organizationId);
      results.push({ orgId: organizationId, insightsGenerated: count });
    } catch (err) {
      console.error(
        `[weekly-synthesis] failed for org ${organizationId}:`,
        err
      );
      results.push({
        orgId: organizationId,
        insightsGenerated: 0,
        error: String(err),
      });
    }
  }

  return NextResponse.json({
    ran: results.length,
    results,
    completedAt: new Date().toISOString(),
  });
}
