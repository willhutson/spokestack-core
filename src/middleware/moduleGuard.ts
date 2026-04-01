import { prisma } from "@/lib/prisma";
import { ModuleType } from "@prisma/client";
import { getModuleByType } from "@/lib/modules/registry";

export interface ModuleGuardResult {
  allowed: boolean;
  upsell?: boolean;
  moduleType: ModuleType;
  message?: string;
  moduleName?: string;
  minTier?: string;
  price?: number | null;
}

/**
 * Check whether the requesting org has a specific module installed and active.
 * Returns a structured result with upsell metadata when the module is not installed.
 */
export async function moduleGuardCheck(
  organizationId: string,
  moduleType: ModuleType
): Promise<ModuleGuardResult> {
  const orgModule = await prisma.orgModule.findUnique({
    where: {
      organizationId_moduleType: { organizationId, moduleType },
    },
    select: { active: true },
  });

  if (orgModule?.active) {
    return { allowed: true, moduleType };
  }

  // Module not installed — build upsell response
  const registryEntry = getModuleByType(moduleType);

  return {
    allowed: false,
    upsell: true,
    moduleType,
    message: registryEntry
      ? `The ${registryEntry.name} module is not installed. Install it from the marketplace to unlock the ${registryEntry.agentName}.`
      : `Module ${moduleType} is not installed.`,
    moduleName: registryEntry?.name,
    minTier: registryEntry?.minTier,
    price: registryEntry?.price,
  };
}
