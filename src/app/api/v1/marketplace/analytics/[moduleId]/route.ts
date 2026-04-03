import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/marketplace/analytics/[moduleId]
 * Publisher analytics for a module they own.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { moduleId } = await params;

  const mod = await prisma.publishedModule.findUnique({
    where: { id: moduleId },
  });
  if (!mod) return error("Not found", 404);
  if (mod.publisherOrgId !== auth.organizationId) {
    return forbidden("Only the publisher can view analytics");
  }

  const [installs, reviews, billingEvents] = await Promise.all([
    prisma.moduleInstall.findMany({
      where: { publishedModuleId: moduleId },
      select: {
        installedAt: true,
        uninstalledAt: true,
        isActive: true,
      },
    }),
    prisma.moduleReview.findMany({
      where: { publishedModuleId: moduleId },
      select: { rating: true, createdAt: true },
    }),
    prisma.moduleBillingEvent.findMany({
      where: {
        publishedModuleId: moduleId,
        type: { in: ["INSTALL", "RENEWAL"] },
      },
      select: {
        amountCents: true,
        publisherShareCents: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeInstalls = installs.filter((i) => i.isActive).length;
  const uninstallCount = installs.filter((i) => !i.isActive).length;
  const churnRate =
    installs.length > 0 ? uninstallCount / installs.length : 0;
  const totalRevenueCents = billingEvents.reduce(
    (s, e) => s + e.publisherShareCents,
    0
  );

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const installsThisWeek = installs.filter(
    (i) => i.installedAt >= sevenDaysAgo
  ).length;

  return json({
    moduleId,
    name: mod.name,
    totalInstalls: installs.length,
    activeInstalls,
    installsThisWeek,
    churnRate: Math.round(churnRate * 100) / 100,
    avgRating: mod.avgRating,
    reviewCount: mod.reviewCount,
    totalRevenueCents,
    totalRevenueFormatted: `AED ${(totalRevenueCents / 100).toFixed(2)}`,
    recentBillingEvents: billingEvents.slice(0, 10),
  });
}
