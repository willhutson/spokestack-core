// Mission Control Router — intent classification and agent routing
// Keyword-based + confidence scoring for fast, deterministic routing.

import type { AgentType, ModuleAgentType } from "@/lib/agents/types";
import { AGENTS } from "@/lib/agents/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoutingDecision {
  selectedAgent: AgentType;
  confidence: number; // 0-1
  reason: string;
  suggestedHandoffs: AgentType[];
}

interface KeywordRule {
  keywords: string[];
  agent: AgentType;
  weight: number;
}

// ---------------------------------------------------------------------------
// MODULE_REGISTRY — maps modules to their agents and output formats
// ---------------------------------------------------------------------------

export interface ModuleRegistryEntry {
  moduleType: string;
  primaryAgent: ModuleAgentType;
  formats: string[]; // supported output artifact formats
  keywords: string[];
}

export const MODULE_REGISTRY: Record<string, ModuleRegistryEntry> = {
  CRM: { moduleType: "CRM", primaryAgent: "module-crm-assistant", formats: ["table", "report", "contact-card"], keywords: ["client", "contact", "lead", "deal", "pipeline", "account", "crm"] },
  TASKS: { moduleType: "TASKS", primaryAgent: "module-tasks-assistant", formats: ["checklist", "table", "kanban"], keywords: ["task", "todo", "checklist", "assign", "due date", "priority"] },
  PROJECTS: { moduleType: "PROJECTS", primaryAgent: "module-projects-assistant", formats: ["timeline", "gantt", "table"], keywords: ["project", "phase", "milestone", "timeline", "gantt", "roadmap"] },
  BRIEFS: { moduleType: "BRIEFS", primaryAgent: "module-briefs-assistant", formats: ["brief", "document", "creative"], keywords: ["brief", "creative brief", "deliverable", "artifact", "review"] },
  ORDERS: { moduleType: "ORDERS", primaryAgent: "module-orders-assistant", formats: ["table", "invoice", "receipt"], keywords: ["order", "purchase", "fulfillment", "ship", "delivery"] },
  ANALYTICS: { moduleType: "ANALYTICS", primaryAgent: "module-analytics-assistant", formats: ["chart", "report", "dashboard"], keywords: ["analytics", "metric", "kpi", "dashboard", "performance", "data"] },
  CONTENT_STUDIO: { moduleType: "CONTENT_STUDIO", primaryAgent: "module-content-studio-assistant", formats: ["document", "design", "template"], keywords: ["content", "asset", "template", "design", "copy", "brand"] },
  SOCIAL_PUBLISHING: { moduleType: "SOCIAL_PUBLISHING", primaryAgent: "module-social-publishing-assistant", formats: ["calendar", "post", "schedule"], keywords: ["social", "publish", "post", "schedule", "instagram", "twitter", "linkedin", "facebook"] },
  FINANCE: { moduleType: "FINANCE", primaryAgent: "module-finance-assistant", formats: ["report", "table", "chart"], keywords: ["finance", "budget", "expense", "revenue", "profit", "cost"] },
  TIME_LEAVE: { moduleType: "TIME_LEAVE", primaryAgent: "module-time-leave-assistant", formats: ["table", "calendar"], keywords: ["time", "leave", "vacation", "timesheet", "hours", "pto"] },
  NPS: { moduleType: "NPS", primaryAgent: "module-nps-assistant", formats: ["chart", "report"], keywords: ["nps", "net promoter", "satisfaction", "score"] },
  SURVEYS: { moduleType: "SURVEYS", primaryAgent: "module-surveys-assistant", formats: ["form", "report", "chart"], keywords: ["survey", "questionnaire", "feedback", "poll", "form"] },
  LISTENING: { moduleType: "LISTENING", primaryAgent: "module-listening-assistant", formats: ["report", "chart", "alert"], keywords: ["listening", "mention", "brand mention", "sentiment", "monitor"] },
  MEDIA_BUYING: { moduleType: "MEDIA_BUYING", primaryAgent: "module-media-buying-assistant", formats: ["report", "table", "chart"], keywords: ["media buy", "ad spend", "campaign", "placement", "cpm", "roas"] },
  LMS: { moduleType: "LMS", primaryAgent: "module-lms-assistant", formats: ["course", "quiz", "document"], keywords: ["course", "training", "learn", "quiz", "lesson", "module"] },
  BOARDS: { moduleType: "BOARDS", primaryAgent: "module-boards-assistant", formats: ["kanban", "table"], keywords: ["board", "kanban", "card", "column", "lane"] },
  WORKFLOWS: { moduleType: "WORKFLOWS", primaryAgent: "module-workflows-assistant", formats: ["workflow", "diagram"], keywords: ["workflow", "automation", "trigger", "action", "rule"] },
  CLIENT_PORTAL: { moduleType: "CLIENT_PORTAL", primaryAgent: "module-client-portal-assistant", formats: ["portal", "document"], keywords: ["portal", "client portal", "share", "external"] },
  SPOKECHAT: { moduleType: "SPOKECHAT", primaryAgent: "module-spokechat-assistant", formats: ["message", "thread"], keywords: ["chat", "message", "channel", "thread", "dm"] },
  DELEGATION: { moduleType: "DELEGATION", primaryAgent: "module-delegation-assistant", formats: ["table", "assignment"], keywords: ["delegate", "delegation", "assign", "handoff", "workload"] },
  ACCESS_CONTROL: { moduleType: "ACCESS_CONTROL", primaryAgent: "module-access-control-assistant", formats: ["table"], keywords: ["permission", "role", "access", "security", "rbac"] },
  API_MANAGEMENT: { moduleType: "API_MANAGEMENT", primaryAgent: "module-api-management-assistant", formats: ["table", "document"], keywords: ["api", "webhook", "key", "endpoint", "integration"] },
  BUILDER: { moduleType: "BUILDER", primaryAgent: "module-builder-assistant", formats: ["document", "schema"], keywords: ["build", "custom module", "extension", "custom field"] },
};

// ---------------------------------------------------------------------------
// MC Specialist keyword rules
// ---------------------------------------------------------------------------

const MC_KEYWORD_RULES: KeywordRule[] = [
  { keywords: ["plan", "roadmap", "timeline", "schedule", "quarter", "sprint"], agent: "mc-planner", weight: 1.2 },
  { keywords: ["strategy", "strategic", "campaign strategy", "positioning", "competitive"], agent: "mc-strategist", weight: 1.3 },
  { keywords: ["analyze", "analysis", "trend", "insight", "data", "report", "metric"], agent: "mc-analyst", weight: 1.1 },
  { keywords: ["review", "check", "quality", "proofread", "feedback", "approve"], agent: "mc-reviewer", weight: 1.0 },
  { keywords: ["schedule", "calendar", "deadline", "reminder", "reschedule", "book"], agent: "mc-scheduler", weight: 1.1 },
  { keywords: ["execute", "run", "do", "create", "build", "make", "generate"], agent: "mc-executor", weight: 0.8 },
  { keywords: ["optimize", "improve", "enhance", "refine", "tune", "better"], agent: "mc-optimizer", weight: 1.0 },
  { keywords: ["teach", "explain", "how to", "tutorial", "learn", "guide", "help me understand"], agent: "mc-educator", weight: 1.0 },
  { keywords: ["email", "draft", "communicate", "message", "notify", "update client"], agent: "mc-communicator", weight: 1.1 },
  { keywords: ["recommend", "advise", "suggest", "should i", "what if", "best practice"], agent: "mc-advisor", weight: 1.0 },
  { keywords: ["expert", "deep dive", "specialist", "advanced", "technical"], agent: "mc-expert", weight: 0.9 },
];

// ---------------------------------------------------------------------------
// classifyGeneralMC — general Mission Control routing
// ---------------------------------------------------------------------------

export function classifyGeneralMC(message: string): RoutingDecision {
  const lower = message.toLowerCase();
  const scores: Map<AgentType, { score: number; reason: string }> = new Map();

  // Check module keywords first — higher specificity
  for (const [, entry] of Object.entries(MODULE_REGISTRY)) {
    const matchCount = entry.keywords.filter((kw) => lower.includes(kw)).length;
    if (matchCount > 0) {
      const score = matchCount * 1.5; // Module matches are weighted higher
      scores.set(entry.primaryAgent, {
        score,
        reason: `Matched ${matchCount} keyword(s) for ${entry.moduleType} module`,
      });
    }
  }

  // Check MC specialist keywords
  for (const rule of MC_KEYWORD_RULES) {
    const matchCount = rule.keywords.filter((kw) => lower.includes(kw)).length;
    if (matchCount > 0) {
      const score = matchCount * rule.weight;
      const existing = scores.get(rule.agent);
      if (!existing || existing.score < score) {
        scores.set(rule.agent, {
          score,
          reason: `Matched ${matchCount} keyword(s) for ${AGENTS[rule.agent].name}`,
        });
      }
    }
  }

  // Pick best match
  let best: { agent: AgentType; score: number; reason: string } = {
    agent: "mc-general",
    score: 0,
    reason: "Default routing — no specific intent detected",
  };

  for (const [agent, { score, reason }] of scores) {
    if (score > best.score) {
      best = { agent, score, reason };
    }
  }

  // Normalize confidence (cap at 1.0)
  const confidence = Math.min(best.score / 3, 1.0);

  // Suggest handoffs from the selected agent
  const metadata = AGENTS[best.agent];
  const suggestedHandoffs = metadata?.handoffTargets ?? [];

  return {
    selectedAgent: best.agent,
    confidence: confidence || 0.1, // minimum 0.1 for default
    reason: best.reason,
    suggestedHandoffs,
  };
}

// ---------------------------------------------------------------------------
// classifyModuleMC — module-specific routing
// ---------------------------------------------------------------------------

export function classifyModuleMC(
  message: string,
  moduleType: string
): RoutingDecision {
  const registry = MODULE_REGISTRY[moduleType];

  if (!registry) {
    // Fall back to general MC
    return classifyGeneralMC(message);
  }

  const lower = message.toLowerCase();

  // Check if message matches MC specialist patterns even within module context
  let bestMCScore = 0;
  let bestMCAgent: AgentType = registry.primaryAgent;
  let bestMCReason = `Default to ${registry.moduleType} primary agent`;

  for (const rule of MC_KEYWORD_RULES) {
    const matchCount = rule.keywords.filter((kw) => lower.includes(kw)).length;
    const score = matchCount * rule.weight;
    if (score > bestMCScore) {
      bestMCScore = score;
      bestMCAgent = rule.agent;
      bestMCReason = `Module context: ${registry.moduleType}, but MC specialist matched for ${AGENTS[rule.agent].name}`;
    }
  }

  // If MC specialist scored high enough, use it instead of module agent
  if (bestMCScore >= 2.0) {
    return {
      selectedAgent: bestMCAgent,
      confidence: Math.min(bestMCScore / 3, 1.0),
      reason: bestMCReason,
      suggestedHandoffs: [registry.primaryAgent, ...(AGENTS[bestMCAgent]?.handoffTargets ?? [])],
    };
  }

  // Default to module primary agent
  const metadata = AGENTS[registry.primaryAgent];
  return {
    selectedAgent: registry.primaryAgent,
    confidence: 0.7,
    reason: `Routed to ${registry.moduleType} primary agent`,
    suggestedHandoffs: metadata?.handoffTargets ?? [],
  };
}
