import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/marketplace/[moduleId]/reviews
 * List reviews for a published module.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { moduleId } = await params;

  const reviews = await prisma.moduleReview.findMany({
    where: { publishedModuleId: moduleId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      rating: true,
      text: true,
      isVerifiedInstall: true,
      createdAt: true,
      reviewerOrgId: true,
    },
  });

  return json({ reviews });
}

/**
 * POST /api/v1/marketplace/[moduleId]/reviews
 * Submit or update a review. Requires active install. Cannot review own module.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { moduleId } = await params;
  const body = await req.json();
  const { rating, text } = body;

  if (!rating || rating < 1 || rating > 5) {
    return error("rating must be 1-5");
  }

  // Must have an active install
  const install = await prisma.moduleInstall.findFirst({
    where: {
      publishedModuleId: moduleId,
      orgId: auth.organizationId,
      isActive: true,
    },
  });
  if (!install) {
    return forbidden("You must install a module before reviewing it");
  }

  // Cannot review your own module
  const mod = await prisma.publishedModule.findUnique({
    where: { id: moduleId },
  });
  if (mod?.publisherOrgId === auth.organizationId) {
    return forbidden("Cannot review your own module");
  }

  const review = await prisma.moduleReview.upsert({
    where: {
      publishedModuleId_reviewerOrgId: {
        publishedModuleId: moduleId,
        reviewerOrgId: auth.organizationId,
      },
    },
    create: {
      publishedModuleId: moduleId,
      reviewerOrgId: auth.organizationId,
      reviewerUserId: auth.user.id,
      rating,
      text: text || null,
      isVerifiedInstall: true,
    },
    update: {
      rating,
      text: text || null,
    },
  });

  // Recalculate module ratings
  const agg = await prisma.moduleReview.aggregate({
    where: { publishedModuleId: moduleId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.publishedModule.update({
    where: { id: moduleId },
    data: {
      avgRating: agg._avg.rating || 0,
      reviewCount: agg._count.rating,
    },
  });

  return json({ ok: true, review }, 201);
}
