import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/content-studio/decks
 * List deck context entries for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: "deck",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return json({ entries });
}

/**
 * POST /api/v1/content-studio/decks
 * Create a new deck context entry.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { title, slides, templateType, briefId } = body;

  if (!title) {
    return error("title is required");
  }

  const key = `deck_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const entry = await prisma.contextEntry.create({
    data: {
      organizationId: auth.organizationId,
      entryType: "ENTITY",
      category: "deck",
      key,
      value: {
        title,
        slides: slides ?? [{ title: "Slide 1", body: "", notes: "" }],
        templateType: templateType ?? null,
        briefId: briefId ?? null,
        createdBy: auth.user.email,
      },
      confidence: 1.0,
    },
  });

  return json({ entry }, 201);
}
