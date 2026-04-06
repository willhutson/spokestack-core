import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { getOrgTier } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { ModuleType } from "@prisma/client";
import { getModuleManifest } from "@/lib/modules/getModuleManifest";

// Core modules cannot be installed via marketplace
const CORE_MODULES: ModuleType[] = ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"];

/**
 * POST /api/v1/marketplace/install
 * Install a marketplace module for the organization.
 *
 * Body options:
 *   { moduleType }            — legacy internal module install
 *   { moduleId, acceptPricing } — marketplace published module install
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can install modules");
  }

  const body = await req.json();
  const { moduleType, moduleId, acceptPricing } = body;

  // --- Marketplace published module install ---
  if (moduleId) {
    if (!acceptPricing) {
      return error(
        "acceptPricing must be true to install a marketplace module"
      );
    }

    const publishedModule = await prisma.publishedModule.findUnique({
      where: { id: moduleId },
    });
    if (!publishedModule || publishedModule.status !== "PUBLISHED") {
      return error("Module not found or not published", 404);
    }

    // Check billing eligibility
    const tier = await getOrgTier(auth.organizationId);
    const pricing = publishedModule.pricing as {
      type: string;
      priceCents?: number;
      monthlyPriceCents?: number;
    };

    if (pricing.type !== "free" && tier === "FREE") {
      return error(
        "UPGRADE_REQUIRED: Paid modules require a Starter plan or above",
        402
      );
    }
    if (
      pricing.type === "subscription" &&
      (pricing.monthlyPriceCents || 0) > 1000 &&
      tier === "STARTER"
    ) {
      return error(
        "UPGRADE_REQUIRED: This module requires a Pro plan",
        402
      );
    }

    // Check already installed
    const existingInstall = await prisma.moduleInstall.findUnique({
      where: {
        publishedModuleId_orgId: {
          publishedModuleId: moduleId,
          orgId: auth.organizationId,
        },
      },
    });
    if (existingInstall?.isActive) {
      return error("Module is already installed", 409);
    }

    // Create OrgModule record (use published module's moduleType as string)
    // Only upsert if it maps to a valid ModuleType enum value
    const validTypes = Object.values(ModuleType);
    if (validTypes.includes(publishedModule.moduleType as ModuleType)) {
      await prisma.orgModule.upsert({
        where: {
          organizationId_moduleType: {
            organizationId: auth.organizationId,
            moduleType: publishedModule.moduleType as ModuleType,
          },
        },
        create: {
          organizationId: auth.organizationId,
          moduleType: publishedModule.moduleType as ModuleType,
          active: true,
        },
        update: { active: true, installedAt: new Date() },
      });
    }

    // Record the install
    await prisma.moduleInstall.upsert({
      where: {
        publishedModuleId_orgId: {
          publishedModuleId: moduleId,
          orgId: auth.organizationId,
        },
      },
      create: {
        publishedModuleId: moduleId,
        orgId: auth.organizationId,
        version: publishedModule.version,
      },
      update: {
        isActive: true,
        version: publishedModule.version,
        uninstalledAt: null,
      },
    });

    // Increment install count
    await prisma.publishedModule.update({
      where: { id: moduleId },
      data: { installCount: { increment: 1 } },
    });

    // Handle billing for paid modules
    if (pricing.type !== "free") {
      const amountCents =
        pricing.type === "paid"
          ? pricing.priceCents || 0
          : pricing.monthlyPriceCents || 0;
      const platformFeeCents = Math.round(amountCents * 0.3);
      await prisma.moduleBillingEvent.create({
        data: {
          publishedModuleId: moduleId,
          orgId: auth.organizationId,
          type: pricing.type === "paid" ? "INSTALL" : "RENEWAL",
          amountCents,
          platformFeeCents,
          publisherShareCents: amountCents - platformFeeCents,
        },
      });
    }

    // Register agent in agent builder (fire-and-forget)
    void registerModuleAgent(publishedModule, auth.organizationId);

    return json(
      {
        ok: true,
        moduleType: publishedModule.moduleType,
        message: `${publishedModule.name} installed successfully`,
      },
      201
    );
  }

  // --- Legacy internal module install (moduleType-based) ---
  if (!moduleType) return error("moduleType or moduleId is required");

  if (CORE_MODULES.includes(moduleType)) {
    return error(
      "Core modules are managed by your billing tier, not the marketplace",
      400
    );
  }

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
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: auth.organizationId },
  });
  if (billing) {
    await prisma.billingMeterEvent.create({
      data: {
        billingAccountId: billing.id,
        eventType: "MODULE_INSTALL",
        quantity: 1,
        metadata: { moduleType },
      },
    });
  }

  // Register with agent builder (fire-and-forget)
  const manifest = getModuleManifest(moduleType);
  if (process.env.AGENT_RUNTIME_URL && manifest?.agentType) {
    fetch(`${process.env.AGENT_RUNTIME_URL}/api/v1/modules/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": process.env.AGENT_RUNTIME_SECRET ?? "",
      },
      body: JSON.stringify({
        orgId: auth.organizationId,
        moduleType,
        agentType: manifest.agentType,
        tools: manifest.tools ?? [],
      }),
    }).catch((err) =>
      console.error("[module install] agent builder registration failed:", err)
    );
  }

  return json(
    { orgModule, message: `${moduleType} module installed successfully` },
    201
  );
}

async function registerModuleAgent(
  mod: { moduleType: string; systemPrompt: string; tools: unknown },
  orgId: string
) {
  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const secret = process.env.AGENT_RUNTIME_SECRET;
  if (!runtimeUrl) return;

  try {
    await fetch(`${runtimeUrl}/api/v1/core/modules/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": secret || "",
      },
      body: JSON.stringify({
        moduleType: mod.moduleType,
        systemPrompt: mod.systemPrompt,
        tools: mod.tools,
        orgId,
      }),
    });
  } catch (e) {
    console.error("[install] Failed to register module agent:", e);
  }
}
