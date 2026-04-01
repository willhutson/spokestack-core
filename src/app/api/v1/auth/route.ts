import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServiceClient } from "@/lib/supabase/server";
import { json, error } from "@/lib/api";
import { seedCoreModules } from "@/lib/modules/seedCoreModules";

/**
 * POST /api/v1/auth
 * Register or sign in a user. Creates a SpokeStack User record
 * linked to the Supabase user.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, supabaseId, name } = body;

  if (!email || !supabaseId) {
    return error("email and supabaseId are required");
  }

  const user = await prisma.user.upsert({
    where: { supabaseId },
    update: { email, name },
    create: { email, supabaseId, name },
    include: {
      memberships: {
        include: { organization: true },
      },
    },
  });

  return json({ user });
}

/**
 * POST /api/v1/auth/org
 * Create a new organization and workspace for the authenticated user.
 */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { supabaseId, orgName, orgSlug } = body;

  if (!supabaseId || !orgName) {
    return error("supabaseId and orgName are required");
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId },
  });

  if (!user) {
    return error("User not found", 404);
  }

  // Generate slug from name if not provided
  const slug =
    orgSlug ||
    orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const org = await prisma.$transaction(async (tx) => {
    // Create organization
    const organization = await tx.organization.create({
      data: { name: orgName, slug },
    });

    // Create billing account (Free tier)
    await tx.billingAccount.create({
      data: {
        organizationId: organization.id,
        tier: "FREE",
        status: "ACTIVE",
      },
    });

    // Create org settings
    await tx.orgSettings.create({
      data: { organizationId: organization.id },
    });

    // Add user as OWNER
    await tx.teamMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    // Seed context milestones
    await tx.contextMilestone.createMany({
      data: [
        {
          organizationId: organization.id,
          milestoneType: "CLIENT_ENTITY_DENSITY",
          threshold: 50,
          recommendedModule: "CRM",
        },
        {
          organizationId: organization.id,
          milestoneType: "BRIEF_CYCLE_COUNT",
          threshold: 10,
          recommendedModule: "ANALYTICS",
        },
        {
          organizationId: organization.id,
          milestoneType: "SOCIAL_CONTENT_PATTERN",
          threshold: 20,
          recommendedModule: "SOCIAL_PUBLISHING",
        },
        {
          organizationId: organization.id,
          milestoneType: "PROJECT_TIMELINE_DENSITY",
          threshold: 5,
          recommendedModule: "TIME_LEAVE",
        },
        {
          organizationId: organization.id,
          milestoneType: "ENGAGEMENT_DEPTH",
          threshold: 100,
        },
        {
          organizationId: organization.id,
          milestoneType: "COLLABORATION_DENSITY",
          threshold: 3,
          recommendedModule: "BOARDS",
        },
      ],
    });

    return organization;
  });

  // Seed core modules (TASKS, PROJECTS, etc.) based on billing tier
  await seedCoreModules(prisma, org.id, "FREE");

  return json({ organization: org }, 201);
}
