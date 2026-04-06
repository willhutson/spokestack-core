import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/content-studio/calendar
 * Return aggregated content items with date, type, platform, status.
 * Supports ?from=&to= date range filtering.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: { in: ["social_post", "brief", "deck"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const items = entries.map((entry) => {
    const val = entry.value as Record<string, unknown>;
    return {
      id: entry.id,
      key: entry.key,
      category: entry.category,
      date: (val.scheduledDate as string) ?? entry.createdAt.toISOString(),
      type: entry.category,
      platform: (val.platform as string) ?? null,
      status: (val.status as string) ?? "draft",
      title: (val.title as string) ?? (val.name as string) ?? entry.key,
    };
  });

  return json({ items });
}
