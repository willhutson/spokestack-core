import { prisma } from "@/lib/prisma";
import { MilestoneType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Redis cache helpers
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

// ---------------------------------------------------------------------------
// Milestone value computation queries
// ---------------------------------------------------------------------------

/**
 * Compute the current numeric value for a specific milestone type.
 */
export async function computeMilestoneValue(
  orgId: string,
  type: MilestoneType
): Promise<number> {
  switch (type) {
    case "CLIENT_ENTITY_DENSITY": {
      // Count unique client entities across briefs + customers
      const [briefClients, customers] = await Promise.all([
        prisma.brief.count({
          where: { organizationId: orgId, clientName: { not: null } },
        }),
        prisma.client.count({
          where: { organizationId: orgId },
        }),
      ]);
      // Dedupe by using max — conservative estimate
      return Math.max(briefClients, customers);
    }

    case "BRIEF_CYCLE_COUNT": {
      // Briefs that reached COMPLETED status (full review cycle)
      return prisma.brief.count({
        where: { organizationId: orgId, status: "COMPLETED" },
      });
    }

    case "SOCIAL_CONTENT_PATTERN": {
      // Count artifacts that are likely social content
      // (COPY + DESIGN types as heuristic)
      return prisma.artifact.count({
        where: {
          brief: { organizationId: orgId },
          type: { in: ["COPY", "DESIGN"] },
        },
      });
    }

    case "PROJECT_TIMELINE_DENSITY": {
      // Active projects with at least one phase defined
      const projects = await prisma.project.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["ACTIVE", "COMPLETED"] },
        },
        include: { _count: { select: { phases: true } } },
      });
      return projects.filter((p) => p._count.phases > 0).length;
    }

    case "ENGAGEMENT_DEPTH": {
      // Total agent messages across all sessions
      return prisma.agentMessage.count({
        where: {
          session: { organizationId: orgId },
        },
      });
    }

    case "COLLABORATION_DENSITY": {
      // Distinct users who have sent at least one agent message
      const messages = await prisma.agentMessage.findMany({
        where: {
          session: { organizationId: orgId },
          userId: { not: null },
        },
        select: { userId: true },
        distinct: ["userId"],
      });
      return messages.length;
    }

    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Recently active orgs
// ---------------------------------------------------------------------------

/**
 * Find organisation IDs that have had agent activity in the last N minutes.
 * This limits the checker to orgs worth evaluating.
 */
export async function getRecentlyActiveOrgs(
  minutesAgo: number = 10
): Promise<string[]> {
  const since = new Date(Date.now() - minutesAgo * 60_000);

  const sessions = await prisma.agentSession.findMany({
    where: {
      startedAt: { gte: since },
    },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  return sessions.map((s) => s.organizationId);
}

// ---------------------------------------------------------------------------
// Main cron job
// ---------------------------------------------------------------------------

/**
 * checkMilestones — intended to run every 5 minutes via cron / scheduled task.
 *
 * 1. Find recently active orgs
 * 2. For each org, compute milestone values
 * 3. Update milestones that have crossed their threshold
 * 4. Invalidate Redis cache for triggered milestones
 */
export async function checkMilestones(): Promise<{
  orgsChecked: number;
  milestonesTriggered: number;
}> {
  const orgIds = await getRecentlyActiveOrgs(10);
  let milestonesTriggered = 0;

  for (const orgId of orgIds) {
    const milestones = await prisma.contextMilestone.findMany({
      where: {
        organizationId: orgId,
        triggered: false,
      },
    });

    for (const milestone of milestones) {
      const value = await computeMilestoneValue(orgId, milestone.milestoneType);

      const updates: Record<string, any> = {
        currentValue: value,
        lastCheckedAt: new Date(),
      };

      if (value >= milestone.threshold) {
        updates.triggered = true;
        updates.triggeredAt = new Date();
        milestonesTriggered += 1;
      }

      await prisma.contextMilestone.update({
        where: { id: milestone.id },
        data: updates,
      });
    }

    // Invalidate Redis cache so getTriggeredMilestones returns fresh data
    const redis = await getRedis();
    if (redis) {
      try {
        await redis.del(`milestones:triggered:${orgId}`);
      } catch {
        // ignore cache errors
      }
    }
  }

  return { orgsChecked: orgIds.length, milestonesTriggered };
}
