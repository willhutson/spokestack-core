// Agent Type System — 47 agents across 3 categories
// Uses Prisma's AgentType enum for session storage, but this file defines
// the full granular agent type system for routing and execution.

// ---------------------------------------------------------------------------
// Agent Type Union (47 types)
// ---------------------------------------------------------------------------

// Onboarding agents (4)
export type OnboardingAgentType =
  | "onboarding-publisher-setup"
  | "onboarding-reply-setup"
  | "onboarding-channel-setup"
  | "onboarding-vertical-config";

// Mission Control specialists (12)
export type MCAgentType =
  | "mc-general"
  | "mc-expert"
  | "mc-planner"
  | "mc-advisor"
  | "mc-reviewer"
  | "mc-scheduler"
  | "mc-analyst"
  | "mc-strategist"
  | "mc-executor"
  | "mc-optimizer"
  | "mc-educator"
  | "mc-communicator";

// Module agents (31)
export type ModuleAgentType =
  | "module-crm-assistant"
  | "module-tasks-assistant"
  | "module-projects-assistant"
  | "module-briefs-assistant"
  | "module-orders-assistant"
  | "module-analytics-assistant"
  | "module-content-studio-assistant"
  | "module-social-publishing-assistant"
  | "module-finance-assistant"
  | "module-time-leave-assistant"
  | "module-nps-assistant"
  | "module-surveys-assistant"
  | "module-listening-assistant"
  | "module-media-buying-assistant"
  | "module-lms-assistant"
  | "module-boards-assistant"
  | "module-workflows-assistant"
  | "module-client-portal-assistant"
  | "module-spokechat-assistant"
  | "module-delegation-assistant"
  | "module-access-control-assistant"
  | "module-api-management-assistant"
  | "module-builder-assistant"
  | "module-invoicing-assistant"
  | "module-reporting-assistant"
  | "module-calendar-assistant"
  | "module-notifications-assistant"
  | "module-integrations-assistant"
  | "module-dam-assistant"
  | "module-approvals-assistant"
  | "module-automations-assistant";

export type AgentType = OnboardingAgentType | MCAgentType | ModuleAgentType;

// ---------------------------------------------------------------------------
// Agent Category
// ---------------------------------------------------------------------------

export type AgentCategory = "onboarding" | "mission-control" | "module";

// ---------------------------------------------------------------------------
// Agent Metadata
// ---------------------------------------------------------------------------

export interface AgentMetadata {
  type: AgentType;
  name: string;
  description: string;
  category: AgentCategory;
  icon: string;
  color: string;
  capabilities: string[];
  /** Maps to the Prisma AgentType enum for session storage */
  prismaAgentType: "ONBOARDING" | "TASKS" | "PROJECTS" | "BRIEFS" | "ORDERS" | "MODULE";
  /** Whether this agent can hand off to other agents */
  canHandoff: boolean;
  /** Agent types this agent can hand off to */
  handoffTargets: AgentType[];
}

// ---------------------------------------------------------------------------
// AGENTS Registry (47 entries)
// ---------------------------------------------------------------------------

export const AGENTS: Record<AgentType, AgentMetadata> = {
  // -- Onboarding (4) -------------------------------------------------------
  "onboarding-publisher-setup": {
    type: "onboarding-publisher-setup",
    name: "Publisher Setup",
    description: "Configures publishing channels and social accounts",
    category: "onboarding",
    icon: "📡",
    color: "from-blue-500 to-cyan-500",
    capabilities: ["Social account linking", "Publishing defaults", "Channel configuration"],
    prismaAgentType: "ONBOARDING",
    canHandoff: true,
    handoffTargets: ["onboarding-channel-setup", "onboarding-vertical-config"],
  },
  "onboarding-reply-setup": {
    type: "onboarding-reply-setup",
    name: "Reply Setup",
    description: "Configures auto-reply rules and response templates",
    category: "onboarding",
    icon: "💬",
    color: "from-green-500 to-emerald-500",
    capabilities: ["Auto-reply configuration", "Response templates", "Tone settings"],
    prismaAgentType: "ONBOARDING",
    canHandoff: true,
    handoffTargets: ["onboarding-publisher-setup", "onboarding-vertical-config"],
  },
  "onboarding-channel-setup": {
    type: "onboarding-channel-setup",
    name: "Channel Setup",
    description: "Configures notification and communication channels",
    category: "onboarding",
    icon: "📢",
    color: "from-purple-500 to-violet-500",
    capabilities: ["Channel selection", "Notification preferences", "Integration setup"],
    prismaAgentType: "ONBOARDING",
    canHandoff: true,
    handoffTargets: ["onboarding-publisher-setup", "onboarding-reply-setup"],
  },
  "onboarding-vertical-config": {
    type: "onboarding-vertical-config",
    name: "Vertical Config",
    description: "Configures industry vertical and module recommendations",
    category: "onboarding",
    icon: "🏢",
    color: "from-amber-500 to-orange-500",
    capabilities: ["Industry detection", "Module recommendations", "Workflow templates"],
    prismaAgentType: "ONBOARDING",
    canHandoff: true,
    handoffTargets: ["mc-general"],
  },

  // -- Mission Control Specialists (12) -------------------------------------
  "mc-general": {
    type: "mc-general",
    name: "General Assistant",
    description: "General-purpose Mission Control assistant for broad queries",
    category: "mission-control",
    icon: "🤖",
    color: "from-blue-500 to-indigo-500",
    capabilities: ["General Q&A", "Navigation", "Quick actions"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-expert", "mc-planner", "mc-analyst", "mc-strategist"],
  },
  "mc-expert": {
    type: "mc-expert",
    name: "Domain Expert",
    description: "Deep domain knowledge for specialized topics",
    category: "mission-control",
    icon: "🎓",
    color: "from-violet-500 to-purple-600",
    capabilities: ["Domain expertise", "Best practices", "Industry knowledge"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-general", "mc-advisor"],
  },
  "mc-planner": {
    type: "mc-planner",
    name: "Planner",
    description: "Plans projects, campaigns, and timelines",
    category: "mission-control",
    icon: "📅",
    color: "from-cyan-500 to-blue-500",
    capabilities: ["Project planning", "Timeline creation", "Resource allocation"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-scheduler", "mc-executor", "mc-strategist"],
  },
  "mc-advisor": {
    type: "mc-advisor",
    name: "Advisor",
    description: "Provides strategic recommendations and guidance",
    category: "mission-control",
    icon: "💡",
    color: "from-yellow-500 to-amber-500",
    capabilities: ["Strategic advice", "Recommendations", "Risk assessment"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-strategist", "mc-analyst"],
  },
  "mc-reviewer": {
    type: "mc-reviewer",
    name: "Reviewer",
    description: "Reviews content, briefs, and deliverables for quality",
    category: "mission-control",
    icon: "✅",
    color: "from-green-500 to-teal-500",
    capabilities: ["Content review", "Quality checks", "Feedback generation"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-optimizer", "mc-general"],
  },
  "mc-scheduler": {
    type: "mc-scheduler",
    name: "Scheduler",
    description: "Manages scheduling, deadlines, and calendar operations",
    category: "mission-control",
    icon: "⏰",
    color: "from-orange-500 to-red-500",
    capabilities: ["Scheduling", "Deadline management", "Calendar sync"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-planner", "mc-executor"],
  },
  "mc-analyst": {
    type: "mc-analyst",
    name: "Analyst",
    description: "Analyzes data, metrics, and performance trends",
    category: "mission-control",
    icon: "📊",
    color: "from-teal-500 to-cyan-600",
    capabilities: ["Data analysis", "Trend detection", "Report generation"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-strategist", "mc-optimizer"],
  },
  "mc-strategist": {
    type: "mc-strategist",
    name: "Strategist",
    description: "Develops high-level strategies and campaign plans",
    category: "mission-control",
    icon: "🎯",
    color: "from-indigo-500 to-violet-500",
    capabilities: ["Strategy development", "Campaign planning", "Goal setting"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-planner", "mc-executor", "mc-analyst"],
  },
  "mc-executor": {
    type: "mc-executor",
    name: "Executor",
    description: "Executes planned actions and manages task completion",
    category: "mission-control",
    icon: "⚡",
    color: "from-red-500 to-orange-500",
    capabilities: ["Task execution", "Bulk operations", "Workflow automation"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-reviewer", "mc-general"],
  },
  "mc-optimizer": {
    type: "mc-optimizer",
    name: "Optimizer",
    description: "Optimizes workflows, content, and processes",
    category: "mission-control",
    icon: "🔧",
    color: "from-slate-500 to-gray-600",
    capabilities: ["Process optimization", "Content tuning", "A/B suggestions"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-analyst", "mc-executor"],
  },
  "mc-educator": {
    type: "mc-educator",
    name: "Educator",
    description: "Teaches users about features, best practices, and workflows",
    category: "mission-control",
    icon: "📚",
    color: "from-emerald-500 to-green-600",
    capabilities: ["Feature walkthroughs", "Best practices", "Training content"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-general", "mc-expert"],
  },
  "mc-communicator": {
    type: "mc-communicator",
    name: "Communicator",
    description: "Drafts communications, emails, and client-facing content",
    category: "mission-control",
    icon: "✉️",
    color: "from-pink-500 to-rose-500",
    capabilities: ["Email drafting", "Client comms", "Status updates"],
    prismaAgentType: "MODULE",
    canHandoff: true,
    handoffTargets: ["mc-reviewer", "mc-general"],
  },

  // -- Module Agents (31) ---------------------------------------------------
  "module-crm-assistant": {
    type: "module-crm-assistant", name: "CRM Assistant", description: "Manages client relationships and contacts",
    category: "module", icon: "👤", color: "from-blue-500 to-blue-600",
    capabilities: ["Contact management", "Deal tracking", "Client insights"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-analyst", "module-invoicing-assistant"],
  },
  "module-tasks-assistant": {
    type: "module-tasks-assistant", name: "Tasks Assistant", description: "Manages tasks, to-dos, and checklists",
    category: "module", icon: "✓", color: "from-green-500 to-green-600",
    capabilities: ["Task creation", "Assignment", "Status updates"],
    prismaAgentType: "TASKS", canHandoff: true, handoffTargets: ["mc-scheduler", "module-projects-assistant"],
  },
  "module-projects-assistant": {
    type: "module-projects-assistant", name: "Projects Assistant", description: "Manages projects, phases, and milestones",
    category: "module", icon: "📁", color: "from-purple-500 to-purple-600",
    capabilities: ["Project setup", "Phase management", "Milestone tracking"],
    prismaAgentType: "PROJECTS", canHandoff: true, handoffTargets: ["mc-planner", "module-tasks-assistant"],
  },
  "module-briefs-assistant": {
    type: "module-briefs-assistant", name: "Briefs Assistant", description: "Creates and manages creative briefs",
    category: "module", icon: "📝", color: "from-emerald-500 to-emerald-600",
    capabilities: ["Brief creation", "Artifact management", "Review workflows"],
    prismaAgentType: "BRIEFS", canHandoff: true, handoffTargets: ["mc-reviewer", "module-content-studio-assistant"],
  },
  "module-orders-assistant": {
    type: "module-orders-assistant", name: "Orders Assistant", description: "Manages orders and fulfillment",
    category: "module", icon: "📦", color: "from-amber-500 to-amber-600",
    capabilities: ["Order creation", "Status tracking", "Invoice generation"],
    prismaAgentType: "ORDERS", canHandoff: true, handoffTargets: ["module-invoicing-assistant", "module-finance-assistant"],
  },
  "module-analytics-assistant": {
    type: "module-analytics-assistant", name: "Analytics Assistant", description: "Analyzes metrics and generates reports",
    category: "module", icon: "📊", color: "from-cyan-500 to-cyan-600",
    capabilities: ["Metric dashboards", "Trend analysis", "Custom reports"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-analyst", "mc-strategist"],
  },
  "module-content-studio-assistant": {
    type: "module-content-studio-assistant", name: "Content Studio Assistant", description: "Creates and manages content assets",
    category: "module", icon: "🎨", color: "from-pink-500 to-pink-600",
    capabilities: ["Content creation", "Asset management", "Template library"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-reviewer", "module-social-publishing-assistant"],
  },
  "module-social-publishing-assistant": {
    type: "module-social-publishing-assistant", name: "Social Publishing Assistant", description: "Schedules and publishes social media content",
    category: "module", icon: "📱", color: "from-indigo-500 to-indigo-600",
    capabilities: ["Post scheduling", "Multi-platform publishing", "Engagement tracking"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-scheduler", "module-analytics-assistant"],
  },
  "module-finance-assistant": {
    type: "module-finance-assistant", name: "Finance Assistant", description: "Manages financial operations and budgets",
    category: "module", icon: "💰", color: "from-green-600 to-emerald-700",
    capabilities: ["Budget tracking", "Expense management", "Financial reports"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["module-invoicing-assistant", "mc-analyst"],
  },
  "module-time-leave-assistant": {
    type: "module-time-leave-assistant", name: "Time & Leave Assistant", description: "Tracks time entries and leave requests",
    category: "module", icon: "🕐", color: "from-orange-500 to-orange-600",
    capabilities: ["Time tracking", "Leave management", "Timesheet reports"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-scheduler", "module-finance-assistant"],
  },
  "module-nps-assistant": {
    type: "module-nps-assistant", name: "NPS Assistant", description: "Manages Net Promoter Score surveys and analysis",
    category: "module", icon: "⭐", color: "from-yellow-500 to-yellow-600",
    capabilities: ["NPS surveys", "Score tracking", "Sentiment analysis"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-analyst", "module-surveys-assistant"],
  },
  "module-surveys-assistant": {
    type: "module-surveys-assistant", name: "Surveys Assistant", description: "Creates and manages surveys and feedback forms",
    category: "module", icon: "📋", color: "from-violet-500 to-violet-600",
    capabilities: ["Survey builder", "Response analysis", "Feedback collection"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-analyst", "module-nps-assistant"],
  },
  "module-listening-assistant": {
    type: "module-listening-assistant", name: "Listening Assistant", description: "Monitors social and brand mentions",
    category: "module", icon: "👂", color: "from-teal-500 to-teal-600",
    capabilities: ["Brand monitoring", "Mention tracking", "Sentiment analysis"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-analyst", "module-social-publishing-assistant"],
  },
  "module-media-buying-assistant": {
    type: "module-media-buying-assistant", name: "Media Buying Assistant", description: "Plans and manages paid media campaigns",
    category: "module", icon: "📺", color: "from-red-500 to-red-600",
    capabilities: ["Campaign setup", "Budget allocation", "Performance tracking"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-strategist", "module-analytics-assistant"],
  },
  "module-lms-assistant": {
    type: "module-lms-assistant", name: "LMS Assistant", description: "Manages learning and training content",
    category: "module", icon: "🎓", color: "from-blue-600 to-blue-700",
    capabilities: ["Course management", "Quiz creation", "Progress tracking"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-educator", "module-content-studio-assistant"],
  },
  "module-boards-assistant": {
    type: "module-boards-assistant", name: "Boards Assistant", description: "Manages kanban boards and visual workflows",
    category: "module", icon: "📌", color: "from-slate-500 to-slate-600",
    capabilities: ["Board management", "Card operations", "Workflow visualization"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["module-tasks-assistant", "module-projects-assistant"],
  },
  "module-workflows-assistant": {
    type: "module-workflows-assistant", name: "Workflows Assistant", description: "Builds and manages automated workflows",
    category: "module", icon: "⚙️", color: "from-gray-500 to-gray-600",
    capabilities: ["Workflow builder", "Automation rules", "Trigger management"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-executor", "module-automations-assistant"],
  },
  "module-client-portal-assistant": {
    type: "module-client-portal-assistant", name: "Client Portal Assistant", description: "Manages client-facing portal and sharing",
    category: "module", icon: "🌐", color: "from-sky-500 to-sky-600",
    capabilities: ["Portal setup", "Client sharing", "Access management"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["module-crm-assistant", "mc-communicator"],
  },
  "module-spokechat-assistant": {
    type: "module-spokechat-assistant", name: "SpokeChat Assistant", description: "Manages internal team chat and messaging",
    category: "module", icon: "💬", color: "from-fuchsia-500 to-fuchsia-600",
    capabilities: ["Channel management", "Message search", "Thread organization"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-communicator", "mc-general"],
  },
  "module-delegation-assistant": {
    type: "module-delegation-assistant", name: "Delegation Assistant", description: "Manages task delegation and approvals",
    category: "module", icon: "🤝", color: "from-rose-500 to-rose-600",
    capabilities: ["Delegation rules", "Approval chains", "Workload balancing"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["module-tasks-assistant", "mc-executor"],
  },
  "module-access-control-assistant": {
    type: "module-access-control-assistant", name: "Access Control Assistant", description: "Manages roles, permissions, and security",
    category: "module", icon: "🔒", color: "from-red-600 to-red-700",
    capabilities: ["Role management", "Permission setup", "Security audits"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-general"],
  },
  "module-api-management-assistant": {
    type: "module-api-management-assistant", name: "API Management Assistant", description: "Manages API keys, webhooks, and integrations",
    category: "module", icon: "🔌", color: "from-neutral-500 to-neutral-600",
    capabilities: ["API key management", "Webhook setup", "Rate limiting"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["module-integrations-assistant", "mc-general"],
  },
  "module-builder-assistant": {
    type: "module-builder-assistant", name: "Builder Assistant", description: "Builds custom modules and extensions",
    category: "module", icon: "🛠️", color: "from-amber-600 to-amber-700",
    capabilities: ["Module builder", "Custom fields", "Extension development"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-expert", "module-api-management-assistant"],
  },
  "module-invoicing-assistant": {
    type: "module-invoicing-assistant", name: "Invoicing Assistant", description: "Creates and manages invoices and billing",
    category: "module", icon: "🧾", color: "from-lime-500 to-lime-600",
    capabilities: ["Invoice creation", "Payment tracking", "Billing reminders"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["module-finance-assistant", "module-orders-assistant"],
  },
  "module-reporting-assistant": {
    type: "module-reporting-assistant", name: "Reporting Assistant", description: "Generates custom reports and dashboards",
    category: "module", icon: "📈", color: "from-cyan-600 to-cyan-700",
    capabilities: ["Custom reports", "Dashboard builder", "Data export"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-analyst", "module-analytics-assistant"],
  },
  "module-calendar-assistant": {
    type: "module-calendar-assistant", name: "Calendar Assistant", description: "Manages calendars, events, and scheduling",
    category: "module", icon: "📅", color: "from-blue-400 to-blue-500",
    capabilities: ["Event management", "Calendar sync", "Availability checking"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-scheduler", "module-tasks-assistant"],
  },
  "module-notifications-assistant": {
    type: "module-notifications-assistant", name: "Notifications Assistant", description: "Manages notification rules and delivery",
    category: "module", icon: "🔔", color: "from-yellow-400 to-yellow-500",
    capabilities: ["Notification rules", "Channel routing", "Digest configuration"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-general"],
  },
  "module-integrations-assistant": {
    type: "module-integrations-assistant", name: "Integrations Assistant", description: "Manages third-party integrations and sync",
    category: "module", icon: "🔗", color: "from-indigo-400 to-indigo-500",
    capabilities: ["Integration setup", "Sync management", "Data mapping"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["module-api-management-assistant", "mc-general"],
  },
  "module-dam-assistant": {
    type: "module-dam-assistant", name: "DAM Assistant", description: "Manages digital asset libraries and media",
    category: "module", icon: "🖼️", color: "from-pink-400 to-pink-500",
    capabilities: ["Asset library", "Media organization", "Version control"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["module-content-studio-assistant", "mc-general"],
  },
  "module-approvals-assistant": {
    type: "module-approvals-assistant", name: "Approvals Assistant", description: "Manages approval workflows and sign-offs",
    category: "module", icon: "✍️", color: "from-emerald-400 to-emerald-500",
    capabilities: ["Approval chains", "Sign-off tracking", "Escalation rules"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["mc-reviewer", "module-delegation-assistant"],
  },
  "module-automations-assistant": {
    type: "module-automations-assistant", name: "Automations Assistant", description: "Builds and manages automation rules",
    category: "module", icon: "🤖", color: "from-violet-400 to-violet-500",
    capabilities: ["Automation rules", "Trigger builder", "Action sequences"],
    prismaAgentType: "MODULE", canHandoff: true, handoffTargets: ["module-workflows-assistant", "mc-executor"],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const ALL_AGENT_TYPES = Object.keys(AGENTS) as AgentType[];

export const ONBOARDING_AGENTS = ALL_AGENT_TYPES.filter(
  (t) => AGENTS[t].category === "onboarding"
) as OnboardingAgentType[];

export const MC_AGENTS = ALL_AGENT_TYPES.filter(
  (t) => AGENTS[t].category === "mission-control"
) as MCAgentType[];

export const MODULE_AGENTS = ALL_AGENT_TYPES.filter(
  (t) => AGENTS[t].category === "module"
) as ModuleAgentType[];

export function getAgentMetadata(type: AgentType): AgentMetadata {
  return AGENTS[type];
}

export function isValidAgentType(type: string): type is AgentType {
  return type in AGENTS;
}
