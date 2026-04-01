import { NextRequest, NextResponse } from "next/server";
import { dispatchSyncs } from "@/lib/sync/dispatcher";

export const runtime = "nodejs";

/**
 * GET /api/cron/sync
 * Vercel Cron handler. Validates CRON_SECRET and dispatches sync jobs
 * for all active integrations that are due.
 * Schedule: every 2 hours (configured in vercel.json)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchSyncs();

  return NextResponse.json({
    dispatched: result.dispatched,
    orgIds: result.orgIds,
    completedAt: new Date().toISOString(),
  });
}
