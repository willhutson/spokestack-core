import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { ModuleType } from "@prisma/client";
import { getModuleByType, tierCanInstall } from "@/lib/modules/registry";
import { installModule } from "@/lib/modules/installer";

/**
 * POST /api/v1/modules/install
 * Install a single module. Uses shared installer logic.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { moduleType } = body as { moduleType?: string };

  if (!moduleType) {
    return error("moduleType is required");
  }

  const validTypes = Object.values(ModuleType);
  if (!validTypes.includes(moduleType as ModuleType)) {
    return error(
      `Invalid moduleType: ${moduleType}. Valid types: ${validTypes.join(", ")}`
    );
  }

  const mt = moduleType as ModuleType;
  const registryEntry = getModuleByType(mt);
  if (!registryEntry) {
    return error(`Module ${moduleType} not found in registry`);
  }

  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: auth.organizationId },
    select: { tier: true },
  });
  const tier = billing?.tier ?? "FREE";

  if (!tierCanInstall(tier, mt)) {
    return json(
      {
        error: `Your ${tier} plan does not support the ${registryEntry.name} module. Minimum tier: ${registryEntry.minTier}.`,
        requiredTier: registryEntry.minTier,
      },
      402
    );
  }

  const result = await installModule(auth.organizationId, mt, tier);

  if (!result.success) {
    return error(result.error ?? "Install failed", 400);
  }

  const orgModule = await prisma.orgModule.findUnique({
    where: {
      organizationId_moduleType: {
        organizationId: auth.organizationId,
        moduleType: mt,
      },
    },
  });

  return json({
    success: true,
    orgModule: orgModule
      ? {
          id: orgModule.id,
          moduleType: orgModule.moduleType,
          installedAt: orgModule.installedAt.toISOString(),
          active: orgModule.active,
        }
      : null,
    agentRegistered: result.agentRegistered,
  });
}
