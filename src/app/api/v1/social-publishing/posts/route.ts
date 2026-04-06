import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/social-publishing/posts
 * List social post context entries.
 * Query params: ?status=DRAFT|SCHEDULED|PUBLISHED  &sort=recent|engagement
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // e.g. "Draft", "Scheduled", "Published"
  const sort = searchParams.get("sort"); // "recent" (default) | "engagement"

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: "social_post",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  // Parse values and apply status filter client-side (status lives inside JSON value)
  let posts = entries.map((e) => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(typeof e.value === "string" ? e.value : JSON.stringify(e.value));
    } catch {
      /* ignore */
    }
    return {
      id: e.id,
      key: e.key,
      content: (parsed.content as string) ?? "",
      platforms: (parsed.platforms as string[]) ?? [],
      scheduledFor: (parsed.scheduledFor as string) ?? "",
      status: (parsed.status as string) ?? "Draft",
      impressions: (parsed.impressions as number) ?? 0,
      likes: (parsed.likes as number) ?? 0,
      comments: (parsed.comments as number) ?? 0,
      engagementRate: (parsed.engagementRate as number) ?? 0,
      publishedAt: (parsed.publishedAt as string) ?? "",
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  });

  if (status) {
    posts = posts.filter(
      (p) => p.status.toLowerCase() === status.toLowerCase()
    );
  }

  if (sort === "engagement") {
    posts.sort((a, b) => b.engagementRate - a.engagementRate);
  } else if (sort === "scheduled") {
    posts.sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() -
        new Date(b.scheduledFor).getTime()
    );
  }
  // default: already sorted by updatedAt desc

  return json({ posts });
}

/**
 * POST /api/v1/social-publishing/posts
 * Create a new social post context entry.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { content, platforms, scheduledFor, status } = body;

  if (!content || !platforms || !Array.isArray(platforms)) {
    return error("content and platforms[] are required");
  }

  const key = `social_${Date.now()}`;
  const entry = await prisma.contextEntry.create({
    data: {
      organizationId: auth.organizationId,
      entryType: "ENTITY",
      category: "social_post",
      key,
      value: JSON.stringify({
        content,
        platforms,
        scheduledFor: scheduledFor ?? new Date().toISOString(),
        status: status ?? "Draft",
        impressions: 0,
        likes: 0,
        comments: 0,
        engagementRate: 0,
        publishedAt: status === "Published" ? new Date().toISOString() : "",
      }),
      confidence: 0.5,
    },
  });

  return json({ entry }, 201);
}
