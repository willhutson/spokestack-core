import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContextEntrySeed {
  entryType: "PREFERENCE" | "INSIGHT" | "ENTITY";
  category: string;
  key: string;
  value: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Industry seed definitions
// ---------------------------------------------------------------------------

const INDUSTRY_CONTEXT_SEEDS: Record<string, ContextEntrySeed[]> = {
  pr_agency: [
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "industry",
      value: { body: "PR and communications agency" },
    },
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "primary_workflow",
      value: {
        body: "Media relations, press releases, and crisis communications",
      },
    },
    {
      entryType: "PREFERENCE",
      category: "agent_behavior",
      key: "pitch_style",
      value: {
        body: "Personalized pitches. Always check journalist beat before pitching.",
      },
    },
    {
      entryType: "PREFERENCE",
      category: "agent_behavior",
      key: "tone",
      value: {
        body: "Professional but conversational. Avoid jargon in external comms.",
      },
    },
  ],

  creative_agency: [
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "industry",
      value: { body: "Creative and digital marketing agency" },
    },
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "primary_workflow",
      value: {
        body: "Campaign briefs, content production, and client reporting",
      },
    },
    {
      entryType: "PREFERENCE",
      category: "agent_behavior",
      key: "brief_format",
      value: { body: "Lead with insight and objective before tactics." },
    },
  ],

  saas: [
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "industry",
      value: { body: "Software as a Service (SaaS)" },
    },
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "primary_workflow",
      value: {
        body: "Product launches, developer relations, and growth marketing",
      },
    },
    {
      entryType: "PREFERENCE",
      category: "agent_behavior",
      key: "tone",
      value: {
        body: "Technical when speaking to developers, benefit-led when speaking to buyers.",
      },
    },
  ],

  ecommerce: [
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "industry",
      value: { body: "E-commerce and retail" },
    },
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "primary_workflow",
      value: {
        body: "Product listings, promotions, customer communications, and influencer campaigns",
      },
    },
  ],

  consulting: [
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "industry",
      value: { body: "Management or strategy consulting" },
    },
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "primary_workflow",
      value: {
        body: "Client deliverables, proposals, and stakeholder communications",
      },
    },
    {
      entryType: "PREFERENCE",
      category: "agent_behavior",
      key: "output_format",
      value: {
        body: "Structured, evidence-first. Lead with the answer, support with data.",
      },
    },
  ],

  law_firm: [
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "industry",
      value: { body: "Law firm or legal services" },
    },
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "primary_workflow",
      value: {
        body: "Client communications, document drafting, and matter management",
      },
    },
    {
      entryType: "PREFERENCE",
      category: "agent_behavior",
      key: "tone",
      value: {
        body: "Precise and formal. Never make definitive legal conclusions — frame as analysis.",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// seedIndustryContext — called at end of onboarding
// ---------------------------------------------------------------------------

export async function seedIndustryContext(
  organizationId: string,
  industry: string,
  orgDetails: {
    name: string;
    size?: string;
    region?: string;
    clients?: string[];
  }
): Promise<void> {
  const seeds: ContextEntrySeed[] = [
    ...(INDUSTRY_CONTEXT_SEEDS[industry] ??
      INDUSTRY_CONTEXT_SEEDS.consulting),
  ];

  // Append org-specific entries
  seeds.push(
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "org_name",
      value: { body: orgDetails.name },
    },
    {
      entryType: "PREFERENCE",
      category: "org_context",
      key: "region",
      value: { body: orgDetails.region ?? "not specified" },
    }
  );

  if (orgDetails.size) {
    seeds.push({
      entryType: "PREFERENCE",
      category: "org_context",
      key: "team_size",
      value: { body: orgDetails.size },
    });
  }

  if (orgDetails.clients && orgDetails.clients.length > 0) {
    seeds.push({
      entryType: "INSIGHT",
      category: "client",
      key: "initial_clients",
      value: { body: orgDetails.clients.join(", ") },
    });
  }

  // Upsert each entry — idempotent
  for (const seed of seeds) {
    await prisma.contextEntry.upsert({
      where: {
        organizationId_category_key: {
          organizationId,
          category: seed.category,
          key: seed.key,
        },
      },
      update: {
        value: seed.value as unknown as import("@prisma/client").Prisma.InputJsonValue,
        entryType: seed.entryType,
      },
      create: {
        organizationId,
        entryType: seed.entryType,
        category: seed.category,
        key: seed.key,
        value: seed.value as unknown as import("@prisma/client").Prisma.InputJsonValue,
        confidence: 1.0,
      },
    });
  }
}
