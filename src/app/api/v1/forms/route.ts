import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/forms
 * Return forms for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: auth.organizationId,
      category: "form",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return json({ entries });
}

/**
 * POST /api/v1/forms
 * Create or update a form.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { name, fields, status } = body;

  if (!name) {
    return error("name is required");
  }

  const key = `form_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;

  const entry = await prisma.contextEntry.create({
    data: {
      organizationId: auth.organizationId,
      entryType: "ENTITY",
      category: "form",
      key,
      value: {
        name,
        fields: fields ?? [],
        status: status ?? "DRAFT",
        responseCount: 0,
        createdBy: auth.user.id,
        createdAt: new Date().toISOString(),
      },
    },
  });

  return json({ entry }, 201);
}
