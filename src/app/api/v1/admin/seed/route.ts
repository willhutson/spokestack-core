import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

const BILLING_TIERS = [
  { type: "FREE" as const, name: "Free", priceMonthly: 0, maxMembers: 3, maxStorageGb: 1, maxMarketplaceModules: 0, surfacesIncluded: ["cli", "web"], modesIncluded: ["tasks"] },
  { type: "STARTER" as const, name: "Starter", priceMonthly: 2900, maxMembers: 10, maxStorageGb: 10, maxMarketplaceModules: 0, surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"], modesIncluded: ["tasks", "projects"] },
  { type: "PRO" as const, name: "Pro", priceMonthly: 5900, maxMembers: 25, maxStorageGb: 50, maxMarketplaceModules: 3, surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"], modesIncluded: ["tasks", "projects", "briefs"] },
  { type: "BUSINESS" as const, name: "Business", priceMonthly: 14900, maxMembers: 50, maxStorageGb: 200, maxMarketplaceModules: 999, surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"], modesIncluded: ["tasks", "projects", "briefs", "orders"] },
  { type: "ENTERPRISE" as const, name: "Enterprise", priceMonthly: 0, maxMembers: 9999, maxStorageGb: 9999, maxMarketplaceModules: 9999, surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"], modesIncluded: ["tasks", "projects", "briefs", "orders"] },
];

const CORE_MODULES = ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"];

const TEMPLATE_MODULES: Record<string, string[]> = {
  agency: ["CRM", "CONTENT_STUDIO", "SOCIAL_PUBLISHING", "ANALYTICS"],
  saas: ["CRM", "ANALYTICS", "BOARDS", "WORKFLOWS"],
  services: ["CRM", "TIME_LEAVE", "FINANCE"],
  ecommerce: ["CRM", "ANALYTICS", "FINANCE"],
  construction: ["TIME_LEAVE", "FINANCE", "WORKFLOWS"],
  consulting: ["CRM", "TIME_LEAVE", "FINANCE", "ANALYTICS"],
  media: ["CONTENT_STUDIO", "SOCIAL_PUBLISHING", "MEDIA_BUYING", "ANALYTICS"],
  education: ["LMS", "SURVEYS", "ANALYTICS", "BOARDS"],
};

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return error("OWNER or ADMIN role required", 403);
  }

  const body = await req.json();
  const tier = body.tier ?? "ENTERPRISE";
  const template = body.template as string | undefined;
  const extraModules = body.modules as string[] | undefined;
  const onboardingComplete = body.onboardingComplete !== false;

  const results: string[] = [];

  // 1. Seed BillingTiers (upsert all 5)
  for (const bt of BILLING_TIERS) {
    await prisma.billingTier.upsert({
      where: { type: bt.type },
      update: {},
      create: bt,
    });
  }
  results.push(`BillingTiers seeded (${BILLING_TIERS.length})`);

  // 2. Create/update BillingAccount
  await prisma.billingAccount.upsert({
    where: { organizationId: auth.organizationId },
    update: { tier, status: "ACTIVE" },
    create: {
      organizationId: auth.organizationId,
      tier,
      status: "ACTIVE",
    },
  });
  results.push(`BillingAccount: ${tier}`);

  // 3. Install modules (core + template + extra)
  const allModules = new Set([
    ...CORE_MODULES,
    ...(template ? TEMPLATE_MODULES[template.toLowerCase()] ?? [] : []),
    ...(extraModules ?? []),
  ]);

  for (const moduleType of allModules) {
    await prisma.orgModule.upsert({
      where: {
        organizationId_moduleType: {
          organizationId: auth.organizationId,
          moduleType: moduleType as import("@prisma/client").ModuleType,
        },
      },
      update: { active: true },
      create: {
        organizationId: auth.organizationId,
        moduleType: moduleType as import("@prisma/client").ModuleType,
        active: true,
      },
    });
  }
  results.push(`Modules installed (${allModules.size}): ${[...allModules].join(", ")}`);

  // 4. OrgSettings
  await prisma.orgSettings.upsert({
    where: { organizationId: auth.organizationId },
    update: { onboardingComplete },
    create: {
      organizationId: auth.organizationId,
      onboardingComplete,
      timezone: body.timezone ?? "UTC",
      language: body.language ?? "en",
    },
  });
  results.push(`OrgSettings: onboardingComplete=${onboardingComplete}`);

  return json({
    ok: true,
    tier,
    modules: [...allModules],
    onboardingComplete,
    results,
  });
}
