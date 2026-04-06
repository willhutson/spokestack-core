import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/content-studio/videos
 * List video context entries for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: "video",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return json({ entries });
}

/**
 * POST /api/v1/content-studio/videos
 * Create a new video context entry.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { title, platform, duration, fileSize, description, tags } = body;

  if (!title) {
    return error("title is required");
  }

  const key = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const entry = await prisma.contextEntry.create({
    data: {
      organizationId: auth.organizationId,
      entryType: "ENTITY",
      category: "video",
      key,
      value: {
        title,
        description: description ?? "",
        platform: platform ?? null,
        duration: duration ?? null,
        fileSize: fileSize ?? null,
        tags: tags ?? [],
        status: "draft",
        createdBy: auth.user.email,
        uploadDate: new Date().toISOString(),
      },
      confidence: 1.0,
    },
  });

  return json({ entry }, 201);
}
