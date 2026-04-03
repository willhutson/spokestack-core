import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/marketplace/my-modules
 * List modules published by the authenticated org.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const modules = await prisma.publishedModule.findMany({
    where: { publisherOrgId: auth.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      category: true,
      status: true,
      version: true,
      installCount: true,
      avgRating: true,
      reviewCount: true,
      qualityScore: true,
      pricing: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return json({ modules });
}
