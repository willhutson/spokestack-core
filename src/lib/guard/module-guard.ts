import { prisma } from "@/lib/prisma";
import { BillingTierType, ModuleType } from "@prisma/client";

export interface GuardResult {
  allowed: boolean;
  upgradeRequired?: boolean;
  installRequired?: boolean;
  targetTier?: BillingTierType;
  message?: string;
}

/**
 * Tier → mode access mapping.
 * Every tenant gets the full schema; gating is application-layer only.
 */
const TIER_MODES: Record<BillingTierType, ModuleType[]> = {
  FREE: [ModuleType.TASKS],
  STARTER: [ModuleType.TASKS, ModuleType.PROJECTS],
  PRO: [ModuleType.TASKS, ModuleType.PROJECTS, ModuleType.BRIEFS],
  BUSINESS: [
    ModuleType.TASKS,
    ModuleType.PROJECTS,
    ModuleType.BRIEFS,
    ModuleType.ORDERS,
  ],
  ENTERPRISE: [
    ModuleType.TASKS,
    ModuleType.PROJECTS,
    ModuleType.BRIEFS,
    ModuleType.ORDERS,
  ],
};

const CORE_MODULES: ModuleType[] = [
  ModuleType.TASKS,
  ModuleType.PROJECTS,
  ModuleType.BRIEFS,
  ModuleType.ORDERS,
];

function getRequiredTier(module: ModuleType): BillingTierType {
  const tierMap: Partial<Record<ModuleType, BillingTierType>> = {
    TASKS: "FREE",
    PROJECTS: "STARTER",
    BRIEFS: "PRO",
    ORDERS: "BUSINESS",
  };
  return tierMap[module] ?? "STARTER";
}

/**
 * ModuleGuard — checks whether an org's billing tier grants access
 * to a given module. Runs before every gated API route.
 */
export async function moduleGuard(
  organizationId: string,
  module: ModuleType
): Promise<GuardResult> {
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId },
  });

  if (!billing) {
    return {
      allowed: false,
      upgradeRequired: true,
      message: "No billing account found",
    };
  }

  const tier = billing.tier;

  // Core mode check — is this mode included in the tier?
  if (CORE_MODULES.includes(module)) {
    const allowed = TIER_MODES[tier].includes(module);
    if (!allowed) {
      const targetTier = getRequiredTier(module);
      return {
        allowed: false,
        upgradeRequired: true,
        targetTier,
        message: `Your ${module} Agent is available on the ${targetTier} plan.`,
      };
    }
    return { allowed: true };
  }

  // Marketplace module check — is the module installed?
  const orgModule = await prisma.orgModule.findUnique({
    where: { organizationId_moduleType: { organizationId, moduleType: module } },
  });

  if (!orgModule || !orgModule.active) {
    return {
      allowed: false,
      installRequired: true,
      message: `The ${module} module is not installed. Browse the marketplace to add it.`,
    };
  }

  return { allowed: true };
}

/**
 * Quick tier check — returns the org's current billing tier.
 */
export async function getOrgTier(
  organizationId: string
): Promise<BillingTierType> {
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId },
    select: { tier: true },
  });
  return billing?.tier ?? "FREE";
}

/**
 * Return which agent types are available for a given tier.
 */
export function getAvailableAgents(
  tier: BillingTierType
): ("TASKS" | "PROJECTS" | "BRIEFS" | "ORDERS")[] {
  const map: Record<BillingTierType, ("TASKS" | "PROJECTS" | "BRIEFS" | "ORDERS")[]> = {
    FREE: ["TASKS"],
    STARTER: ["TASKS", "PROJECTS"],
    PRO: ["TASKS", "PROJECTS", "BRIEFS"],
    BUSINESS: ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"],
    ENTERPRISE: ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"],
  };
  return map[tier];
}
