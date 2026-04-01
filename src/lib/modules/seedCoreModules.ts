import { PrismaClient, BillingTierType, ModuleType } from "@prisma/client";

/** Core modules that map to BillingTier.modesIncluded */
const CORE_MODULE_MAP: Record<string, ModuleType> = {
  tasks: "TASKS",
  projects: "PROJECTS",
  briefs: "BRIEFS",
  orders: "ORDERS",
};

/**
 * Seed OrgModule rows for the four core modes based on the org's billing tier.
 * Called during org creation so that moduleGuard treats core modules
 * identically to marketplace modules.
 */
export async function seedCoreModules(
  prisma: PrismaClient,
  organizationId: string,
  tier: BillingTierType
): Promise<void> {
  // Look up what modes this tier includes
  const billingTier = await prisma.billingTier.findUnique({
    where: { type: tier },
    select: { modesIncluded: true },
  });

  const modes = billingTier?.modesIncluded ?? ["tasks"];

  const moduleTypes = modes
    .map((mode) => CORE_MODULE_MAP[mode])
    .filter((mt): mt is ModuleType => mt !== undefined);

  if (moduleTypes.length === 0) return;

  await prisma.orgModule.createMany({
    data: moduleTypes.map((moduleType) => ({
      organizationId,
      moduleType,
      active: true,
    })),
    skipDuplicates: true,
  });
}
