import { prisma } from "@/lib/prisma";

const AGENT_RUNTIME_URL = process.env.AGENT_RUNTIME_URL!;
const AGENT_RUNTIME_SECRET = process.env.AGENT_RUNTIME_SECRET!;

const SYNTHESIS_PROMPT = `You are analyzing this organization's recent activity. Generate 3-5 actionable insights that connect patterns across different areas (tasks, projects, briefs, orders). Each insight should be specific, data-backed, and actionable.

Return your response as a JSON array of objects, each with:
- "title": short insight headline (max 10 words)
- "body": detailed insight with specific data points (2-3 sentences)
- "category": one of: tasks, projects, briefs, orders, cross-functional
- "confidence": number 0.0-1.0

Example format:
[
  {
    "title": "Brief approval cycle slowed 30% this month",
    "body": "Review phase is the bottleneck — 8 of 12 briefs stalled at review for 3+ days. Consider assigning a dedicated reviewer or setting review SLAs.",
    "category": "briefs",
    "confidence": 0.85
  }
]`;

/**
 * Run weekly context synthesis for an organization.
 * Fetches recent ContextEntry records, sends them to the agent-builder
 * for analysis, and writes INSIGHT entries back to the context graph.
 */
export async function runSynthesisForOrg(orgId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentEntries = await prisma.contextEntry.findMany({
    where: {
      organizationId: orgId,
      createdAt: { gte: sevenDaysAgo },
      entryType: { in: ["ENTITY", "PATTERN", "MILESTONE"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (recentEntries.length === 0) {
    return 0;
  }

  // Group entries by category for the prompt
  const grouped = recentEntries.reduce<
    Record<string, typeof recentEntries>
  >((acc, entry) => {
    const cat = entry.category ?? "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {});

  const entrySummary = Object.entries(grouped)
    .map(([cat, entries]) => {
      const lines = entries
        .slice(0, 10)
        .map(
          (e) =>
            `  - [${e.entryType}] ${e.key}: ${JSON.stringify(e.value)}`
        );
      return `${cat} (${entries.length} entries):\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const fullPrompt = `[SYNTHESIS]\n\nRecent activity data (last 7 days):\n\n${entrySummary}\n\n${SYNTHESIS_PROMPT}`;

  // Call agent runtime with the synthesis prompt
  const agentRes = await fetch(`${AGENT_RUNTIME_URL}/agent/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Agent-Secret": AGENT_RUNTIME_SECRET,
    },
    body: JSON.stringify({
      message: fullPrompt,
      orgId,
      surface: "SYSTEM",
    }),
  });

  if (!agentRes.ok) {
    throw new Error(
      `Agent runtime synthesis failed: ${agentRes.status} ${await agentRes.text()}`
    );
  }

  const agentData = await agentRes.json();
  const rawContent: string =
    agentData.response ?? agentData.content ?? agentData.message ?? "";

  // Extract JSON array from the response
  const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Agent did not return a JSON array of insights");
  }

  const insights: Array<{
    title: string;
    body: string;
    category: string;
    confidence: number;
  }> = JSON.parse(jsonMatch[0]);

  // Write insights back as INSIGHT ContextEntry records
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  await prisma.contextEntry.createMany({
    data: insights.map((insight) => ({
      organizationId: orgId,
      entryType: "INSIGHT" as const,
      category: "synthesis.weekly",
      key: `insight.${now.toISOString().slice(0, 10)}.${insight.category}.${Math.random().toString(36).slice(2, 8)}`,
      value: {
        title: insight.title,
        body: insight.body,
        sourceCategory: insight.category,
        generatedAt: now.toISOString(),
        sourceEntryCount: recentEntries.length,
      },
      confidence: Math.min(Math.max(insight.confidence ?? 0.7, 0), 1),
      expiresAt,
    })),
  });

  return insights.length;
}
