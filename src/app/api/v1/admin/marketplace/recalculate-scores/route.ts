import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, error } from "@/lib/api";

/**
 * POST /api/v1/admin/marketplace/recalculate-scores
 * Nightly cron job to recalculate quality scores for all published modules.
 * Auth: X-Cron-Secret header must match CRON_SECRET env var.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return error("Unauthorized", 401);
  }

  const modules = await prisma.publishedModule.findMany({
    where: { status: "PUBLISHED" },
    include: {
      moduleInstalls: { select: { isActive: true } },
      moduleReviews: { select: { rating: true } },
    },
  });

  let updated = 0;

  for (const mod of modules) {
    const totalInstalls = mod.moduleInstalls.length;
    const activeInstalls = mod.moduleInstalls.filter((i) => i.isActive).length;
    const activeRate = totalInstalls > 0 ? activeInstalls / totalInstalls : 0;
    const churnRate = totalInstalls > 0 ? 1 - activeRate : 0;
    const reviewCount = mod.moduleReviews.length;
    const avgRating =
      reviewCount > 0
        ? mod.moduleReviews.reduce((s, r) => s + r.rating, 0) / reviewCount
        : 0;

    // Quality score formula (0-100)
    const installScore =
      (Math.log10(totalInstalls + 1) / Math.log10(1000)) * 20;
    const retentionScore = activeRate * 25;
    const ratingScore = reviewCount > 0 ? ((avgRating - 1) / 4) * 20 : 0;
    const reviewCountScore = (Math.min(reviewCount, 50) / 50) * 10;
    const churnScore = (1 - churnRate) * 15;
    const responsivenessScore = 10; // default until support system exists

    const qualityScore = Math.min(
      100,
      Math.round(
        installScore +
          retentionScore +
          ratingScore +
          reviewCountScore +
          churnScore +
          responsivenessScore
      )
    );

    await prisma.publishedModule.update({
      where: { id: mod.id },
      data: { qualityScore, avgRating, reviewCount },
    });

    updated++;
  }

  return json({ ok: true, updated });
}
