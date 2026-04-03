import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/marketplace/review/queue
 * Admin-only review queue for pending marketplace modules.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const adminOrgId = process.env.SPOKESTACK_ADMIN_ORG_ID;
  if (!adminOrgId || auth.organizationId !== adminOrgId) {
    return forbidden();
  }

  const queue = await prisma.publishedModule.findMany({
    where: {
      status: { in: ["PENDING_REVIEW", "CHANGES_REQUESTED"] },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      status: true,
      version: true,
      securityScore: true,
      createdAt: true,
      publisherOrgId: true,
      tools: true,
      systemPrompt: true,
      pricing: true,
    },
  });

  return json({ queue, count: queue.length });
}
