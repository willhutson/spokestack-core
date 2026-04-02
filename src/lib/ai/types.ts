// AI Model Tier Configuration
// Maps agent types to model tiers for cost/performance optimization.

import type { AgentType } from "@/lib/agents/types";

// ---------------------------------------------------------------------------
// Model Tier
// ---------------------------------------------------------------------------

export type ModelTier = "economy" | "standard" | "premium" | "creative" | "vision";

// ---------------------------------------------------------------------------
// Model Config
// ---------------------------------------------------------------------------

export interface ModelConfig {
  provider: "anthropic" | "openai" | "google";
  model: string;
  maxTokens: number;
  temperature: number;
}

// ---------------------------------------------------------------------------
// MODEL_TIERS — default config per tier
// ---------------------------------------------------------------------------

export const MODEL_TIERS: Record<ModelTier, ModelConfig> = {
  economy: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 2048,
    temperature: 0.3,
  },
  standard: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 4096,
    temperature: 0.5,
  },
  premium: {
    provider: "anthropic",
    model: "claude-opus-4-20250514",
    maxTokens: 8192,
    temperature: 0.4,
  },
  creative: {
    provider: "anthropic",
    model: "claude-opus-4-20250514",
    maxTokens: 8192,
    temperature: 0.8,
  },
  vision: {
    provider: "anthropic",
    model: "claude-opus-4-20250514",
    maxTokens: 4096,
    temperature: 0.3,
  },
};

// ---------------------------------------------------------------------------
// AGENT_TIER_MAP — every AgentType mapped to a ModelTier
// ---------------------------------------------------------------------------

export const AGENT_TIER_MAP: Record<AgentType, ModelTier> = {
  // Onboarding — economy (simple guided flows)
  "onboarding-publisher-setup": "economy",
  "onboarding-reply-setup": "economy",
  "onboarding-channel-setup": "economy",
  "onboarding-vertical-config": "standard",

  // MC specialists
  "mc-general": "standard",
  "mc-expert": "premium",
  "mc-planner": "standard",
  "mc-advisor": "premium",
  "mc-reviewer": "standard",
  "mc-scheduler": "economy",
  "mc-analyst": "standard",
  "mc-strategist": "premium",
  "mc-executor": "standard",
  "mc-optimizer": "standard",
  "mc-educator": "economy",
  "mc-communicator": "creative",

  // Module agents
  "module-crm-assistant": "standard",
  "module-tasks-assistant": "economy",
  "module-projects-assistant": "standard",
  "module-briefs-assistant": "creative",
  "module-orders-assistant": "economy",
  "module-analytics-assistant": "standard",
  "module-content-studio-assistant": "creative",
  "module-social-publishing-assistant": "standard",
  "module-finance-assistant": "standard",
  "module-time-leave-assistant": "economy",
  "module-nps-assistant": "economy",
  "module-surveys-assistant": "economy",
  "module-listening-assistant": "standard",
  "module-media-buying-assistant": "standard",
  "module-lms-assistant": "standard",
  "module-boards-assistant": "economy",
  "module-workflows-assistant": "standard",
  "module-client-portal-assistant": "economy",
  "module-spokechat-assistant": "economy",
  "module-delegation-assistant": "economy",
  "module-access-control-assistant": "economy",
  "module-api-management-assistant": "economy",
  "module-builder-assistant": "premium",
  "module-invoicing-assistant": "economy",
  "module-reporting-assistant": "standard",
  "module-calendar-assistant": "economy",
  "module-notifications-assistant": "economy",
  "module-integrations-assistant": "economy",
  "module-dam-assistant": "standard",
  "module-approvals-assistant": "economy",
  "module-automations-assistant": "standard",
};

// ---------------------------------------------------------------------------
// MODULE_AGENT_MAP — ModuleType to agent mapping
// ---------------------------------------------------------------------------

type ModuleType =
  | "TASKS" | "PROJECTS" | "BRIEFS" | "ORDERS"
  | "CRM" | "SOCIAL_PUBLISHING" | "CONTENT_STUDIO" | "ANALYTICS"
  | "SURVEYS" | "LISTENING" | "MEDIA_BUYING" | "LMS" | "NPS"
  | "TIME_LEAVE" | "BOARDS" | "FINANCE" | "WORKFLOWS" | "CLIENT_PORTAL"
  | "SPOKECHAT" | "DELEGATION" | "ACCESS_CONTROL" | "API_MANAGEMENT" | "BUILDER";

export interface ModuleAgentMapping {
  module: ModuleType;
  primaryAgent: AgentType;
  secondaryAgents: AgentType[];
}

export const MODULE_AGENT_MAP: ModuleAgentMapping[] = [
  { module: "CRM", primaryAgent: "module-crm-assistant", secondaryAgents: ["mc-analyst", "module-invoicing-assistant"] },
  { module: "TASKS", primaryAgent: "module-tasks-assistant", secondaryAgents: ["mc-scheduler", "module-projects-assistant"] },
  { module: "PROJECTS", primaryAgent: "module-projects-assistant", secondaryAgents: ["mc-planner", "module-tasks-assistant"] },
  { module: "BRIEFS", primaryAgent: "module-briefs-assistant", secondaryAgents: ["mc-reviewer", "module-content-studio-assistant"] },
  { module: "ORDERS", primaryAgent: "module-orders-assistant", secondaryAgents: ["module-invoicing-assistant", "module-finance-assistant"] },
  { module: "ANALYTICS", primaryAgent: "module-analytics-assistant", secondaryAgents: ["mc-analyst", "module-reporting-assistant"] },
  { module: "CONTENT_STUDIO", primaryAgent: "module-content-studio-assistant", secondaryAgents: ["mc-reviewer", "module-dam-assistant"] },
  { module: "SOCIAL_PUBLISHING", primaryAgent: "module-social-publishing-assistant", secondaryAgents: ["mc-scheduler", "module-analytics-assistant"] },
  { module: "FINANCE", primaryAgent: "module-finance-assistant", secondaryAgents: ["module-invoicing-assistant", "mc-analyst"] },
  { module: "TIME_LEAVE", primaryAgent: "module-time-leave-assistant", secondaryAgents: ["mc-scheduler", "module-calendar-assistant"] },
  { module: "NPS", primaryAgent: "module-nps-assistant", secondaryAgents: ["mc-analyst", "module-surveys-assistant"] },
  { module: "SURVEYS", primaryAgent: "module-surveys-assistant", secondaryAgents: ["mc-analyst", "module-nps-assistant"] },
  { module: "LISTENING", primaryAgent: "module-listening-assistant", secondaryAgents: ["mc-analyst", "module-social-publishing-assistant"] },
  { module: "MEDIA_BUYING", primaryAgent: "module-media-buying-assistant", secondaryAgents: ["mc-strategist", "module-analytics-assistant"] },
  { module: "LMS", primaryAgent: "module-lms-assistant", secondaryAgents: ["mc-educator", "module-content-studio-assistant"] },
  { module: "BOARDS", primaryAgent: "module-boards-assistant", secondaryAgents: ["module-tasks-assistant", "module-projects-assistant"] },
  { module: "WORKFLOWS", primaryAgent: "module-workflows-assistant", secondaryAgents: ["mc-executor", "module-automations-assistant"] },
  { module: "CLIENT_PORTAL", primaryAgent: "module-client-portal-assistant", secondaryAgents: ["module-crm-assistant", "mc-communicator"] },
  { module: "SPOKECHAT", primaryAgent: "module-spokechat-assistant", secondaryAgents: ["mc-communicator", "mc-general"] },
  { module: "DELEGATION", primaryAgent: "module-delegation-assistant", secondaryAgents: ["module-tasks-assistant", "mc-executor"] },
  { module: "ACCESS_CONTROL", primaryAgent: "module-access-control-assistant", secondaryAgents: ["mc-general"] },
  { module: "API_MANAGEMENT", primaryAgent: "module-api-management-assistant", secondaryAgents: ["module-integrations-assistant"] },
  { module: "BUILDER", primaryAgent: "module-builder-assistant", secondaryAgents: ["mc-expert", "module-api-management-assistant"] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getModelConfig(agentType: AgentType): ModelConfig {
  const tier = AGENT_TIER_MAP[agentType];
  return MODEL_TIERS[tier];
}

export function getAgentTier(agentType: AgentType): ModelTier {
  return AGENT_TIER_MAP[agentType];
}

export function getModuleAgents(moduleType: string): ModuleAgentMapping | undefined {
  return MODULE_AGENT_MAP.find((m) => m.module === moduleType);
}
