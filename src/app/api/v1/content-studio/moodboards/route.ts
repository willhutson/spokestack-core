import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/content-studio/moodboards
 * List moodboard context entries for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: "moodboard",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return json({ entries });
}

/**
 * POST /api/v1/content-studio/moodboards
 * Create a new moodboard context entry.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { name, tags } = body;

  if (!name) {
    return error("name is required");
  }

  const key = `moodboard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const entry = await prisma.contextEntry.create({
    data: {
      organizationId: auth.organizationId,
      entryType: "ENTITY",
      category: "moodboard",
      key,
      value: {
        name,
        images: [],
        tags: tags ?? [],
        createdBy: auth.user.email,
      },
      confidence: 1.0,
    },
  });

  return json({ entry }, 201);
}
