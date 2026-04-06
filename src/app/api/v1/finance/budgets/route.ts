import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/finance/budgets
 * List budget context entries for the authenticated org.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const budgets = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: "budget",
    },
    orderBy: { createdAt: "desc" },
  });

  return json({ budgets });
}

/**
 * POST /api/v1/finance/budgets
 * Create a new budget context entry.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  let body: { key: string; value: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  if (!body.key || !body.value) {
    return error("key and value are required");
  }

  const budget = await prisma.contextEntry.create({
    data: {
      organizationId: auth.organizationId,
      entryType: "MANUAL",
      category: "budget",
      key: body.key,
      value: body.value as Record<string, unknown>,
      confidence: 1.0,
    },
  });

  return json({ budget }, 201);
}
