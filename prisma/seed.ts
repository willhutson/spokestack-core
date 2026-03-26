import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  console.log("Seeding SpokeStack Core database...");

  // ── Billing Tiers ──────────────────────────────────────────────────────
  const tiers = [
    {
      type: "FREE" as const,
      name: "Free",
      priceMonthly: 0,
      maxMembers: 3,
      maxStorageGb: 1,
      maxMarketplaceModules: 0,
      surfacesIncluded: ["cli", "web"],
      modesIncluded: ["tasks"],
    },
    {
      type: "STARTER" as const,
      name: "Starter",
      priceMonthly: 2900, // $29.00
      maxMembers: 10,
      maxStorageGb: 10,
      maxMarketplaceModules: 0,
      surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"],
      modesIncluded: ["tasks", "projects"],
    },
    {
      type: "PRO" as const,
      name: "Pro",
      priceMonthly: 5900, // $59.00
      maxMembers: 25,
      maxStorageGb: 50,
      maxMarketplaceModules: 3,
      surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"],
      modesIncluded: ["tasks", "projects", "briefs"],
    },
    {
      type: "BUSINESS" as const,
      name: "Business",
      priceMonthly: 14900, // $149.00
      maxMembers: 50,
      maxStorageGb: 200,
      maxMarketplaceModules: 999,
      surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"],
      modesIncluded: ["tasks", "projects", "briefs", "orders"],
    },
    {
      type: "ENTERPRISE" as const,
      name: "Enterprise",
      priceMonthly: 0, // Custom pricing
      maxMembers: 9999,
      maxStorageGb: 9999,
      maxMarketplaceModules: 9999,
      surfacesIncluded: ["cli", "web", "desktop", "mobile", "whatsapp"],
      modesIncluded: ["tasks", "projects", "briefs", "orders"],
    },
  ];

  for (const tier of tiers) {
    await prisma.billingTier.upsert({
      where: { type: tier.type },
      update: tier,
      create: tier,
    });
    console.log(`  ✓ BillingTier: ${tier.name} ($${tier.priceMonthly / 100}/mo)`);
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
