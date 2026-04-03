import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";
import { Prisma } from "@prisma/client";

/**
 * GET /api/v1/marketplace/browse
 * Browse published marketplace modules with filters, search, and pagination.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const industry = searchParams.get("industry");
  const priceType = searchParams.get("priceType");
  const sort = searchParams.get("sort") || "popular";
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "24", 10),
    48
  );

  const where: Prisma.PublishedModuleWhereInput = {
    status: "PUBLISHED",
  };

  if (category) where.category = category;
  if (industry) where.industry = industry;

  if (priceType) {
    where.pricing = {
      path: ["type"],
      equals: priceType,
    };
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const orderByMap: Record<string, Prisma.PublishedModuleOrderByWithRelationInput> = {
    popular: { installCount: "desc" },
    newest: { createdAt: "desc" },
    rating: { avgRating: "desc" },
    quality: { qualityScore: "desc" },
  };
  const orderBy = orderByMap[sort] || orderByMap.popular;

  const [modules, total] = await Promise.all([
    prisma.publishedModule.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        category: true,
        industry: true,
        installCount: true,
        avgRating: true,
        reviewCount: true,
        pricing: true,
        qualityScore: true,
        version: true,
        publisherOrgId: true,
        createdAt: true,
      },
    }),
    prisma.publishedModule.count({ where }),
  ]);

  return json({
    modules,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
