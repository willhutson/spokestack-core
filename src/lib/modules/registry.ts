import registryData from "./registry.json";
import { ModuleType, BillingTierType } from "@prisma/client";

export interface RegistryModule {
  moduleType: ModuleType;
  name: string;
  description: string;
  category: "core" | "marketing" | "ops" | "analytics" | "enterprise";
  minTier: BillingTierType;
  price: number | null; // cents per month, null = included in tier
  agentName: string;
  surfaces: string[];
}

const TIER_ORDER: BillingTierType[] = [
  "FREE",
  "STARTER",
  "PRO",
  "BUSINESS",
  "ENTERPRISE",
];

const registry: RegistryModule[] = registryData as RegistryModule[];

export function getModuleByType(
  type: ModuleType
): RegistryModule | undefined {
  return registry.find((m) => m.moduleType === type);
}

export function getAvailableModules(): RegistryModule[] {
  return registry;
}

export function getModulesForTier(tier: BillingTierType): RegistryModule[] {
  const tierIdx = TIER_ORDER.indexOf(tier);
  return registry.filter(
    (m) => TIER_ORDER.indexOf(m.minTier) <= tierIdx
  );
}

export function getCoreModules(): RegistryModule[] {
  return registry.filter((m) => m.category === "core");
}

export function getMarketplaceModules(): RegistryModule[] {
  return registry.filter(
    (m) => m.category !== "core" && m.category !== "enterprise"
  );
}

export function getEnterpriseModules(): RegistryModule[] {
  return registry.filter((m) => m.category === "enterprise");
}

export function tierCanInstall(
  tier: BillingTierType,
  moduleType: ModuleType
): boolean {
  const mod = getModuleByType(moduleType);
  if (!mod) return false;
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(mod.minTier);
}
