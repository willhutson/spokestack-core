import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const entries = await prisma.contextEntry.findMany({
    where: { organizationId: auth.organizationId, category: "module_template" },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return json({ templates: entries });
}
