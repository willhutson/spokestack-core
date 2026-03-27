import { BillingTierType, ModuleType } from "@prisma/client";

export interface TierConfig {
  type: BillingTierType;
  name: string;
  priceMonthly: number; // cents
  maxMembers: number;
  maxStorageGb: number;
  maxMarketplaceModules: number;
  surfacesIncluded: string[];
  modesIncluded: ModuleType[];
  rateLimit: number; // requests per minute
}

/**
 * Full tier limit configuration — single source of truth.
 */
export const TIER_LIMITS: Record<BillingTierType, TierConfig> = {
  FREE: {
    type: "FREE",
    name: "Free",
    priceMonthly: 0,
    maxMembers: 2,
    maxStorageGb: 1,
    maxMarketplaceModules: 0,
    surfacesIncluded: ["cli", "web"],
    modesIncluded: [ModuleType.TASKS],
    rateLimit: 20,
  },
  STARTER: {
    type: "STARTER",
    name: "Starter",
    priceMonthly: 2900, // $29
    maxMembers: 5,
    maxStorageGb: 10,
    maxMarketplaceModules: 2,
    surfacesIncluded: ["cli", "web", "desktop"],
    modesIncluded: [ModuleType.TASKS, ModuleType.PROJECTS],
    rateLimit: 40,
  },
  PRO: {
    type: "PRO",
    name: "Pro",
    priceMonthly: 7900, // $79
    maxMembers: 15,
    maxStorageGb: 50,
    maxMarketplaceModules: 5,
    surfacesIncluded: ["cli", "web", "desktop", "mobile"],
    modesIncluded: [ModuleType.TASKS, ModuleType.PROJECTS, ModuleType.BRIEFS],
    rateLimit: 80,
  },
  BUSINESS: {
    type: "BUSINESS",
    name: "Business",
    priceMonthly: 19900, // $199
    maxMembers: 50,
    maxStorageGb: 200,
    maxMarketplaceModules: 20,
    surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"],
    modesIncluded: [
      ModuleType.TASKS,
      ModuleType.PROJECTS,
      ModuleType.BRIEFS,
      ModuleType.ORDERS,
    ],
    rateLimit: 200,
  },
  ENTERPRISE: {
    type: "ENTERPRISE",
    name: "Enterprise",
    priceMonthly: 0, // custom pricing
    maxMembers: 9999,
    maxStorageGb: 9999,
    maxMarketplaceModules: 9999,
    surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"],
    modesIncluded: [
      ModuleType.TASKS,
      ModuleType.PROJECTS,
      ModuleType.BRIEFS,
      ModuleType.ORDERS,
    ],
    rateLimit: Infinity,
  },
};

/**
 * Get full configuration for a billing tier.
 */
export function getTierConfig(tier: BillingTierType): TierConfig {
  return TIER_LIMITS[tier];
}

/**
 * Check whether a tier grants access to a specific module.
 */
export function tierGrantsAccess(
  tier: BillingTierType,
  module: ModuleType
): boolean {
  return TIER_LIMITS[tier].modesIncluded.includes(module);
}

/**
 * Return the minimum tier required for a given module.
 * Marketplace modules (CRM, SOCIAL_PUBLISHING, etc.) require STARTER at minimum.
 */
export function getRequiredTier(module: ModuleType): BillingTierType {
  const tierOrder: BillingTierType[] = [
    "FREE",
    "STARTER",
    "PRO",
    "BUSINESS",
    "ENTERPRISE",
  ];

  for (const tier of tierOrder) {
    if (TIER_LIMITS[tier].modesIncluded.includes(module)) {
      return tier;
    }
  }

  // Marketplace / add-on modules require at least STARTER
  return "STARTER";
}
