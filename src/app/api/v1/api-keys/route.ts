import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const entries = await prisma.contextEntry.findMany({
    where: { organizationId: auth.organizationId, category: "api_key" },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return json({ entries });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { key, value } = body;

  if (!key) return error("key is required");

  const entry = await prisma.contextEntry.upsert({
    where: {
      organizationId_category_key: {
        organizationId: auth.organizationId,
        category: "api_key",
        key,
      },
    },
    update: {
      value: typeof value === "string" ? value : JSON.stringify(value),
    },
    create: {
      organizationId: auth.organizationId,
      entryType: "ENTITY",
      category: "api_key",
      key,
      value: typeof value === "string" ? value : JSON.stringify(value),
    },
  });

  return json({ entry });
}
