import { PrismaClient, AgentType, ContextType } from "@prisma/client";

// ── Types ────────────────────────────────────────────────────────────────

interface ContextEntry {
  id: string;
  entryType: ContextType;
  category: string;
  key: string;
  value: any;
  confidence: number;
  sourceAgentType: AgentType | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MilestoneState {
  milestoneType: string;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  triggeredAt: Date | null;
  recommendedModule: string | null;
  dismissed: boolean;
}

// ── Context categories relevant per agent ────────────────────────────────

const AGENT_CONTEXT_CATEGORIES: Record<AgentType, string[]> = {
  ONBOARDING: ["team", "client", "workflow", "preference", "business"],
  TASKS: ["team", "client", "workflow", "preference", "task_pattern"],
  PROJECTS: ["team", "client", "workflow", "project_pattern", "timeline"],
  BRIEFS: ["team", "client", "creative_preference", "review_pattern", "brief_pattern"],
  ORDERS: ["client", "customer", "order_pattern", "pricing", "revenue"],
  MODULE: ["team", "client", "workflow", "preference"],
};

// ── Load Context ─────────────────────────────────────────────────────────

/**
 * Load relevant context entries for an agent turn.
 * Fetches the most relevant entries filtered by agent type categories,
 * ordered by confidence descending.
 */
export async function loadRelevantContext(
  prisma: PrismaClient,
  orgId: string,
  agentType: AgentType,
  limit: number = 30
): Promise<ContextEntry[]> {
  const categories = AGENT_CONTEXT_CATEGORIES[agentType] ?? [];

  const entries = await prisma.contextEntry.findMany({
    where: {
      organizationId: orgId,
      AND: [
        // Match relevant entries by category, confidence, or source agent
        {
          OR: [
            ...(categories.length > 0
              ? [{ category: { in: categories } }]
              : []),
            { confidence: { gte: 0.8 } },
            { sourceAgentType: agentType },
          ],
        },
        // Skip expired entries
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ],
    },
    orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return entries;
}

// ── Format for Prompt ────────────────────────────────────────────────────

/**
 * Format context entries as a concise text block for inclusion in the
 * system prompt. Groups entries by category for readability.
 */
export function formatContextForPrompt(entries: ContextEntry[]): string {
  if (entries.length === 0) return "";

  const grouped = new Map<string, ContextEntry[]>();
  for (const entry of entries) {
    const group = grouped.get(entry.category) ?? [];
    group.push(entry);
    grouped.set(entry.category, group);
  }

  const sections: string[] = [];

  for (const [category, items] of grouped) {
    const label = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const lines = items.map((item) => {
      const val =
        typeof item.value === "object"
          ? JSON.stringify(item.value)
          : String(item.value);
      const conf = item.confidence >= 0.8 ? "" : ` (confidence: ${item.confidence.toFixed(1)})`;
      return `  - ${item.key}: ${val}${conf}`;
    });
    sections.push(`[${label}]\n${lines.join("\n")}`);
  }

  return `\n--- Organizational Context ---\n${sections.join("\n\n")}\n--- End Context ---\n`;
}

// ── Evaluate Context Updates ─────────────────────────────────────────────

/**
 * After an agent turn, evaluate whether new context should be written.
 * This uses simple heuristics — not a separate LLM call — to detect
 * entities, patterns, and preferences from the conversation.
 */
export async function evaluateContextUpdates(
  prisma: PrismaClient,
  orgId: string,
  agentType: AgentType,
  userMessage: string,
  agentResponse: string
): Promise<void> {
  const combinedText = `${userMessage} ${agentResponse}`;

  // 1. Detect named entities (people, companies, etc.)
  const entities = extractEntities(combinedText);
  for (const entity of entities) {
    const key = entity.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (key.length < 2) continue;

    await prisma.contextEntry.upsert({
      where: {
        organizationId_category_key: {
          organizationId: orgId,
          category: entity.category,
          key,
        },
      },
      update: {
        confidence: { increment: 0.05 },
        updatedAt: new Date(),
      },
      create: {
        organizationId: orgId,
        entryType: "ENTITY",
        category: entity.category,
        key,
        value: { name: entity.name, detectedIn: agentType },
        confidence: 0.3,
        sourceAgentType: agentType,
      },
    });
  }

  // 2. Detect preference signals
  const preferences = extractPreferences(userMessage);
  for (const pref of preferences) {
    await prisma.contextEntry.upsert({
      where: {
        organizationId_category_key: {
          organizationId: orgId,
          category: "preference",
          key: pref.key,
        },
      },
      update: {
        value: pref.value,
        confidence: { increment: 0.1 },
        updatedAt: new Date(),
      },
      create: {
        organizationId: orgId,
        entryType: "PREFERENCE",
        category: "preference",
        key: pref.key,
        value: pref.value,
        confidence: 0.5,
        sourceAgentType: agentType,
      },
    });
  }

  // 3. Update milestone counters
  await updateMilestoneCounters(prisma, orgId, agentType, combinedText);
}

// ── Milestone State ──────────────────────────────────────────────────────

/**
 * Get triggered milestones that haven't been dismissed.
 * These drive marketplace module recommendations.
 */
export async function getTriggeredMilestones(
  prisma: PrismaClient,
  orgId: string
): Promise<MilestoneState[]> {
  const milestones = await prisma.contextMilestone.findMany({
    where: {
      organizationId: orgId,
      triggered: true,
      dismissed: false,
    },
  });

  return milestones;
}

// ── Internal Helpers ─────────────────────────────────────────────────────

interface DetectedEntity {
  name: string;
  category: string;
}

function extractEntities(text: string): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  const stopWords = new Set([
    "the", "this", "that", "these", "those", "what", "when", "where",
    "which", "who", "how", "and", "but", "for", "not", "all", "can",
    "had", "her", "was", "one", "our", "out", "are", "has", "his",
    "its", "may", "new", "now", "old", "see", "way", "day", "did",
    "get", "got", "let", "say", "she", "too", "use", "yes", "yet",
    "will", "would", "could", "should", "have", "been", "they",
    "them", "their", "with", "from", "into", "just", "also",
    "about", "more", "some", "than", "then", "very", "here",
    "there", "like", "make", "made", "please", "thanks", "thank",
    "sure", "okay", "need", "want", "help", "create", "update",
  ]);

  // Match capitalized multi-word names (2+ words)
  const multiWord = text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+/g) || [];
  for (const match of multiWord) {
    const words = match.split(" ");
    const allStop = words.every((w) => stopWords.has(w.toLowerCase()));
    if (!allStop && match.length > 3) {
      entities.push({ name: match, category: "client" });
    }
  }

  // Detect email-like patterns as contacts
  const emails = text.match(/\b[\w.-]+@[\w.-]+\.\w{2,}\b/g) || [];
  for (const email of emails) {
    entities.push({ name: email, category: "client" });
  }

  return entities;
}

interface DetectedPreference {
  key: string;
  value: any;
}

function extractPreferences(text: string): DetectedPreference[] {
  const prefs: DetectedPreference[] = [];
  const lower = text.toLowerCase();

  // Detect timezone preferences
  const tzMatch = lower.match(
    /\b(?:timezone|time zone|tz)\s*(?:is|:)?\s*([a-z/_]+)/i
  );
  if (tzMatch) {
    prefs.push({ key: "timezone", value: { timezone: tzMatch[1] } });
  }

  // Detect language preferences
  const langMatch = lower.match(
    /\b(?:language|lang)\s*(?:is|:)?\s*(english|spanish|french|german|portuguese|arabic|chinese|japanese|korean)\b/i
  );
  if (langMatch) {
    prefs.push({ key: "language", value: { language: langMatch[1].toLowerCase() } });
  }

  // Detect communication style preferences
  if (lower.includes("keep it brief") || lower.includes("be concise") || lower.includes("short answers")) {
    prefs.push({ key: "communication_style", value: { style: "concise" } });
  }
  if (lower.includes("detailed") || lower.includes("thorough") || lower.includes("comprehensive")) {
    prefs.push({ key: "communication_style", value: { style: "detailed" } });
  }

  return prefs;
}

async function updateMilestoneCounters(
  prisma: PrismaClient,
  orgId: string,
  agentType: AgentType,
  _text: string
): Promise<void> {
  // Increment engagement depth for every agent interaction
  try {
    await prisma.contextMilestone.upsert({
      where: {
        organizationId_milestoneType: {
          organizationId: orgId,
          milestoneType: "ENGAGEMENT_DEPTH",
        },
      },
      update: {
        currentValue: { increment: 1 },
        lastCheckedAt: new Date(),
      },
      create: {
        organizationId: orgId,
        milestoneType: "ENGAGEMENT_DEPTH",
        threshold: 50,
        currentValue: 1,
        recommendedModule: null,
      },
    });

    // Check if any milestones should be triggered
    const milestones = await prisma.contextMilestone.findMany({
      where: {
        organizationId: orgId,
        triggered: false,
      },
    });

    for (const milestone of milestones) {
      if (milestone.currentValue >= milestone.threshold) {
        await prisma.contextMilestone.update({
          where: { id: milestone.id },
          data: {
            triggered: true,
            triggeredAt: new Date(),
          },
        });
      }
    }
  } catch (err) {
    // Non-critical — don't fail the agent turn
    console.error("Milestone update error:", err);
  }
}
