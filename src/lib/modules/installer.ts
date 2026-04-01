import { prisma } from "@/lib/prisma";
import { ModuleType, BillingTierType } from "@prisma/client";
import { getModuleByType, tierCanInstall } from "@/lib/modules/registry";

export interface InstallResult {
  moduleType: string;
  success: boolean;
  agentRegistered: boolean;
  error?: string;
  requiredTier?: string;
}

/**
 * Install a single module for an organization.
 * Shared logic used by both the single install endpoint and batch install.
 */
export async function installModule(
  organizationId: string,
  moduleType: ModuleType,
  tier: BillingTierType
): Promise<InstallResult> {
  const registryEntry = getModuleByType(moduleType);
  if (!registryEntry) {
    return {
      moduleType,
      success: false,
      agentRegistered: false,
      error: `Module ${moduleType} not found in registry`,
    };
  }

  // Check if already installed and active
  const existing = await prisma.orgModule.findUnique({
    where: {
      organizationId_moduleType: { organizationId, moduleType },
    },
  });

  if (existing?.active) {
    return {
      moduleType,
      success: true,
      agentRegistered: true,
      error: "Already installed",
    };
  }

  // Check tier eligibility
  if (!tierCanInstall(tier, moduleType)) {
    return {
      moduleType,
      success: false,
      agentRegistered: false,
      error: `${tier} plan does not support ${registryEntry.name}`,
      requiredTier: registryEntry.minTier,
    };
  }

  // Upsert OrgModule
  await prisma.orgModule.upsert({
    where: {
      organizationId_moduleType: { organizationId, moduleType },
    },
    update: { active: true },
    create: { organizationId, moduleType, active: true },
  });

  // Register with agent-builder (non-blocking)
  let agentRegistered = false;
  const agentBuilderUrl = process.env.AGENT_BUILDER_URL;
  if (agentBuilderUrl) {
    try {
      const res = await fetch(
        `${agentBuilderUrl}/api/v1/core/modules/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: organizationId,
            moduleType,
            agentDefinition: {
              name: registryEntry.agentName,
              description: registryEntry.description,
            },
          }),
        }
      );
      agentRegistered = res.ok;
    } catch {
      agentRegistered = false;
    }
  }

  return { moduleType, success: true, agentRegistered };
}
