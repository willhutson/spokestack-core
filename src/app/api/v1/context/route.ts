import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/context
 * Read context entries for the organization (the shared context graph).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const entryType = searchParams.get("entryType");
  const category = searchParams.get("category");
  const key = searchParams.get("key");

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(entryType ? { entryType: entryType as never } : {}),
      ...(category ? { category } : {}),
      ...(key ? { key } : {}),
      // Exclude expired entries
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return json({ entries });
}

/**
 * POST /api/v1/context
 * Create or update a context entry for the organization.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { entryType, category, key, value, confidence, sourceAgentType, expiresAt } = body;

  if (!entryType || !category || !key) {
    return error("entryType, category, and key are required");
  }

  const entry = await prisma.contextEntry.upsert({
    where: {
      organizationId_category_key: {
        organizationId: auth.organizationId,
        category,
        key,
      },
    },
    update: {
      entryType: entryType,
      value: typeof value === "string" ? value : JSON.stringify(value),
      confidence: confidence ?? 0.5,
      sourceAgentType: sourceAgentType ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    create: {
      organizationId: auth.organizationId,
      entryType,
      category,
      key,
      value: typeof value === "string" ? value : JSON.stringify(value),
      confidence: confidence ?? 0.5,
      sourceAgentType: sourceAgentType ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return json({ entry });
}
