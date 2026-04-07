import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types returned to agent routes
// ---------------------------------------------------------------------------

export interface ContextEntryForAgent {
  id: string;
  entryType: string;
  category: string;
  key: string;
  value: unknown;
  confidence: number;
  createdAt: Date;
}

export interface IntegrationForAgent {
  provider: string;
  status: string;
  moduleType: string | null;
}

export interface EventForAgent {
  entityType: string;
  action: string;
  entityId: string;
  metadata: unknown;
}

// ---------------------------------------------------------------------------
// Module → context category mapping
// ---------------------------------------------------------------------------

export const MODULE_CONTEXT_CATEGORIES: Record<string, string[]> = {
  MEDIA_RELATIONS: ["journalist", "media_list", "coverage", "pitch"],
  PRESS_RELEASES: ["press_release", "media_list", "journalist"],
  CRISIS_COMMS: ["crisis_stakeholder", "crisis_playbook", "media_list"],
  CLIENT_REPORTING: ["report_metric", "coverage", "client"],
  INFLUENCER_MGMT: ["influencer", "campaign"],
  EVENTS: ["event_guest", "vendor", "event_timeline"],
  CRM: ["contact", "deal", "company"],
  CONTENT_STUDIO: ["brand_guide", "content_calendar"],
  ANALYTICS: ["report_metric"],
  SOCIAL_PUBLISHING: ["social_post", "content_calendar"],
  FINANCE: ["budget", "invoice"],
  TASKS: ["task", "org_context"],
  PROJECTS: ["project", "org_context"],
  BRIEFS: ["brief", "org_context"],
  ORDERS: ["order", "client"],
};

// ---------------------------------------------------------------------------
// fetchOrgContext — general-purpose, used by Mission Control and chat routes
// ---------------------------------------------------------------------------

export async function fetchOrgContext(organizationId: string): Promise<{
  contextEntries: ContextEntryForAgent[];
  integrations: IntegrationForAgent[];
  recentEvents: EventForAgent[];
}> {
  const [contextEntries, integrations, recentEvents] = await Promise.all([
    // High-value ContextEntry records — PREFERENCE first, then INSIGHT, ENTITY
    prisma.contextEntry
      .findMany({
        where: {
          organizationId,
          entryType: { in: ["PREFERENCE", "INSIGHT", "ENTITY"] },
        },
        orderBy: [{ entryType: "asc" }, { createdAt: "desc" }],
        take: 50,
        select: {
          id: true,
          entryType: true,
          category: true,
          key: true,
          value: true,
          confidence: true,
          createdAt: true,
        },
      })
      .catch(() => []),

    // Active integrations
    prisma.integration
      .findMany({
        where: { organizationId, status: "ACTIVE" },
        select: {
          provider: true,
          status: true,
          moduleType: true,
        },
      })
      .catch(() => []),

    // Recent org activity — last 10 EntityEvent records
    prisma.entityEvent
      .findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          entityType: true,
          action: true,
          entityId: true,
          metadata: true,
        },
      })
      .catch(() => []),
  ]);

  return {
    contextEntries: contextEntries as ContextEntryForAgent[],
    integrations: integrations as IntegrationForAgent[],
    recentEvents: recentEvents as EventForAgent[],
  };
}

// ---------------------------------------------------------------------------
// fetchModuleContext — filtered to categories relevant to the module
// ---------------------------------------------------------------------------

export async function fetchModuleContext(
  organizationId: string,
  moduleType: string
): Promise<{
  contextEntries: ContextEntryForAgent[];
  integrations: IntegrationForAgent[];
  recentEvents: EventForAgent[];
}> {
  const categories =
    MODULE_CONTEXT_CATEGORIES[moduleType.toUpperCase()];

  if (!categories) {
    return fetchOrgContext(organizationId);
  }

  const contextEntries = await prisma.contextEntry
    .findMany({
      where: {
        organizationId,
        category: { in: categories },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        entryType: true,
        category: true,
        key: true,
        value: true,
        confidence: true,
        createdAt: true,
      },
    })
    .catch(() => []);

  return {
    contextEntries: contextEntries as ContextEntryForAgent[],
    integrations: [],
    recentEvents: [],
  };
}
