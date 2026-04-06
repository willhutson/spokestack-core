import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/team/departments
 * Return departments for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: "department",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return json({ entries });
}

/**
 * POST /api/v1/team/departments
 * Create a new department.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { name, head, description } = body;

  if (!name) {
    return error("name is required");
  }

  const key = `department_${name.toLowerCase().replace(/\s+/g, "_")}`;

  const entry = await prisma.contextEntry.upsert({
    where: {
      organizationId_category_key: {
        organizationId: auth.organizationId,
        category: "department",
        key,
      },
    },
    update: {
      value: { name, head: head ?? null, description: description ?? "", memberCount: 0 },
    },
    create: {
      organizationId: auth.organizationId,
      entryType: "STRUCTURED",
      category: "department",
      key,
      value: { name, head: head ?? null, description: description ?? "", memberCount: 0 },
    },
  });

  return json({ entry }, 201);
}
