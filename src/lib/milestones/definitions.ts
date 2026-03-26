import { prisma } from "@/lib/prisma";
import { MilestoneType, ModuleType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Milestone definitions — the six flywheel triggers
// ---------------------------------------------------------------------------

export interface MilestoneDefinition {
  type: MilestoneType;
  label: string;
  description: string;
  threshold: number;
  recommendedModule: ModuleType;
  recommendation: string;
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    type: "CLIENT_ENTITY_DENSITY",
    label: "Client Density",
    description:
      "Number of unique client entities extracted from briefs and orders.",
    threshold: 5,
    recommendedModule: ModuleType.CRM,
    recommendation:
      "You have enough client data to benefit from the CRM module. It auto-syncs contacts from your briefs and orders.",
  },
  {
    type: "BRIEF_CYCLE_COUNT",
    label: "Brief Cycles",
    description: "Number of briefs that have completed a full review cycle.",
    threshold: 3,
    recommendedModule: ModuleType.CONTENT_STUDIO,
    recommendation:
      "Your creative output is growing. The Content Studio module centralises assets and accelerates production.",
  },
  {
    type: "SOCIAL_CONTENT_PATTERN",
    label: "Social Content Patterns",
    description:
      "Number of social-related artifacts detected in briefs and tasks.",
    threshold: 10,
    recommendedModule: ModuleType.SOCIAL_PUBLISHING,
    recommendation:
      "You are producing social content regularly. The Social Publishing module lets your agent schedule and post directly.",
  },
  {
    type: "PROJECT_TIMELINE_DENSITY",
    label: "Project Timeline Density",
    description:
      "Number of active projects with defined phases and milestones.",
    threshold: 3,
    recommendedModule: ModuleType.ANALYTICS,
    recommendation:
      "Your project portfolio is maturing. The Analytics module provides timeline insights and forecasting.",
  },
  {
    type: "ENGAGEMENT_DEPTH",
    label: "Engagement Depth",
    description:
      "Total agent messages exchanged, reflecting how deeply the org uses the agent.",
    threshold: 100,
    recommendedModule: ModuleType.WORKFLOWS,
    recommendation:
      "You are using the agent extensively. The Workflows module lets you automate repetitive conversation patterns.",
  },
  {
    type: "COLLABORATION_DENSITY",
    label: "Collaboration Density",
    description:
      "Number of team members actively interacting with the platform.",
    threshold: 4,
    recommendedModule: ModuleType.BOARDS,
    recommendation:
      "Your team is growing. The Boards module gives everyone a shared visual workspace.",
  },
];

// ---------------------------------------------------------------------------
// Seed / dismiss / read helpers
// ---------------------------------------------------------------------------

/**
 * Seed all milestone rows for a newly-created organisation.
 * Safe to call multiple times — uses upsert.
 */
export async function seedMilestones(orgId: string): Promise<void> {
  await Promise.all(
    MILESTONE_DEFINITIONS.map((def) =>
      prisma.contextMilestone.upsert({
        where: {
          organizationId_milestoneType: {
            organizationId: orgId,
            milestoneType: def.type,
          },
        },
        create: {
          organizationId: orgId,
          milestoneType: def.type,
          threshold: def.threshold,
          recommendedModule: def.recommendedModule,
        },
        update: {},
      })
    )
  );
}

/**
 * Mark a milestone as dismissed ("not now").
 */
export async function dismissMilestone(
  orgId: string,
  milestoneType: MilestoneType
): Promise<void> {
  await prisma.contextMilestone.update({
    where: {
      organizationId_milestoneType: {
        organizationId: orgId,
        milestoneType: milestoneType,
      },
    },
    data: { dismissed: true, dismissedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Redis-cached triggered milestones
// ---------------------------------------------------------------------------

let redisClient: any = null;
let redisReady = false;

async function getRedis(): Promise<any | null> {
  if (!process.env.REDIS_URL) return null;

  if (redisClient && redisReady) return redisClient;

  try {
    const { createClient } = await import("redis");
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", () => {
      redisReady = false;
    });
    await redisClient.connect();
    redisReady = true;
    return redisClient;
  } catch {
    redisReady = false;
    return null;
  }
}

/**
 * Get triggered (but not dismissed) milestones for an org.
 * Reads from Redis cache first, falls back to Prisma.
 */
export async function getTriggeredMilestones(
  orgId: string
): Promise<MilestoneType[]> {
  const cacheKey = `milestones:triggered:${orgId}`;
  const redis = await getRedis();

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as MilestoneType[];
    } catch {
      // fall through to Prisma
    }
  }

  const milestones = await prisma.contextMilestone.findMany({
    where: {
      organizationId: orgId,
      triggered: true,
      dismissed: false,
    },
    select: { milestoneType: true },
  });

  const types = milestones.map((m) => m.milestoneType);

  // Cache for 5 minutes
  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(types), { EX: 300 });
    } catch {
      // ignore cache write failures
    }
  }

  return types;
}
