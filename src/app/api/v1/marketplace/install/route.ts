import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { getOrgTier } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { ModuleType } from "@prisma/client";

// Core modules cannot be installed via marketplace
const CORE_MODULES: ModuleType[] = ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"];

/**
 * POST /api/v1/marketplace/install
 * Install a marketplace module for the organization.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can install modules");
  }

  const body = await req.json();
  const { moduleType } = body;

  if (!moduleType) return error("moduleType is required");

  if (CORE_MODULES.includes(moduleType)) {
    return error("Core modules are managed by your billing tier, not the marketplace", 400);
  }

  // Check tier limits for marketplace module count
  const tier = await getOrgTier(auth.organizationId);
  const tierLimits: Record<string, number> = {
    FREE: 0,
    STARTER: 2,
    PRO: 5,
    BUSINESS: 10,
    ENTERPRISE: 999,
  };

  const maxModules = tierLimits[tier] ?? 0;
  const currentModuleCount = await prisma.orgModule.count({
    where: {
      organizationId: auth.organizationId,
      active: true,
      moduleType: { notIn: CORE_MODULES },
    },
  });

  if (currentModuleCount >= maxModules) {
    return error(
      `Your ${tier} plan allows ${maxModules} marketplace modules. Upgrade for more.`,
      403
    );
  }

  // Check if already installed
  const existing = await prisma.orgModule.findUnique({
    where: {
      organizationId_moduleType: {
        organizationId: auth.organizationId,
        moduleType,
      },
    },
  });

  if (existing && existing.active) {
    return error("Module is already installed", 409);
  }

  // Re-activate or create
  const orgModule = existing
    ? await prisma.orgModule.update({
        where: { id: existing.id },
        data: { active: true, installedAt: new Date() },
      })
    : await prisma.orgModule.create({
        data: {
          organizationId: auth.organizationId,
          moduleType,
          active: true,
        },
      });

  // Record meter event
  await prisma.billingMeterEvent.create({
    data: {
      billingAccountId: (
        await prisma.billingAccount.findUnique({
          where: { organizationId: auth.organizationId },
        })
      )!.id,
      eventType: "MODULE_INSTALL",
      quantity: 1,
      metadata: { moduleType },
    },
  });

  return json({ orgModule, message: `${moduleType} module installed successfully` }, 201);
}
