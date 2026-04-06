import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/time-leave/entries
 * Return time entries (timer / timesheet data) for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const userId = searchParams.get("userId");

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: "time_entry",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  let filtered = entries;
  if (date) {
    filtered = filtered.filter((e) => {
      const v = e.value as Record<string, unknown>;
      return v.date === date;
    });
  }
  if (userId) {
    filtered = filtered.filter((e) => {
      const v = e.value as Record<string, unknown>;
      return v.userId === userId;
    });
  }

  return json({ entries: filtered });
}

/**
 * POST /api/v1/time-leave/entries
 * Create a new time entry.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { project, startTime, endTime, duration, notes, date } = body;

  if (!date) {
    return error("date is required");
  }

  const key = `time_entry_${auth.userId}_${date}_${Date.now()}`;

  const entry = await prisma.contextEntry.create({
    data: {
      organizationId: auth.organizationId,
      entryType: "STRUCTURED",
      category: "time_entry",
      key,
      value: {
        userId: auth.userId,
        project: project ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        duration: duration ?? 0,
        notes: notes ?? "",
        date,
      },
    },
  });

  return json({ entry }, 201);
}
