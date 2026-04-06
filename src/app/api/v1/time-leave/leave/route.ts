import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/time-leave/leave
 * Return leave requests for the organization. Supports ?status= filter.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: "leave_request",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  let filtered = entries;
  if (status) {
    filtered = filtered.filter((e) => {
      const v = e.value as Record<string, unknown>;
      return v.status === status;
    });
  }

  return json({ entries: filtered });
}

/**
 * POST /api/v1/time-leave/leave
 * Create a new leave request.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { type, startDate, endDate, notes } = body;

  if (!type || !startDate || !endDate) {
    return error("type, startDate, and endDate are required");
  }

  const key = `leave_request_${auth.user.id}_${Date.now()}`;

  const entry = await prisma.contextEntry.create({
    data: {
      organizationId: auth.organizationId,
      entryType: "ENTITY",
      category: "leave_request",
      key,
      value: {
        userId: auth.user.id,
        type,
        startDate,
        endDate,
        notes: notes ?? "",
        status: "Pending",
        requestedAt: new Date().toISOString(),
      },
    },
  });

  return json({ entry }, 201);
}
