export type ModuleStatus = "core" | "marketplace" | "coming_soon";

export interface ModuleInfo {
  id: string;
  label: string;
  status: ModuleStatus;
  marketplacePath?: string;
}

export const MODULE_REGISTRY: Record<string, ModuleInfo> = {
  TASKS: { id: "TASKS", label: "Tasks", status: "core" },
  PROJECTS: { id: "PROJECTS", label: "Projects", status: "core" },
  BRIEFS: { id: "BRIEFS", label: "Briefs", status: "core" },
  ORDERS: { id: "ORDERS", label: "Orders", status: "core" },
  COMMUNICATION: {
    id: "COMMUNICATION",
    label: "Communications",
    status: "core",
  },
  CRM: {
    id: "CRM",
    label: "CRM",
    status: "marketplace",
    marketplacePath: "/marketplace",
  },
  CONTENT_STUDIO: {
    id: "CONTENT_STUDIO",
    label: "Content Studio",
    status: "marketplace",
    marketplacePath: "/marketplace",
  },
  FINANCE: { id: "FINANCE", label: "Finance", status: "coming_soon" },
  TIME_LEAVE: {
    id: "TIME_LEAVE",
    label: "Time & Leave",
    status: "marketplace",
    marketplacePath: "/marketplace",
  },
  SOCIAL_PUBLISHING: {
    id: "SOCIAL_PUBLISHING",
    label: "Social Publishing",
    status: "marketplace",
    marketplacePath: "/marketplace",
  },
  ANALYTICS: {
    id: "ANALYTICS",
    label: "Analytics",
    status: "marketplace",
    marketplacePath: "/marketplace",
  },
  WORKFLOWS: {
    id: "WORKFLOWS",
    label: "Workflows",
    status: "marketplace",
    marketplacePath: "/marketplace",
  },
};

export interface ToolMapping {
  moduleId: string;
  nangoProvider?: string; // Nango provider ID for OAuth connect
}

// Normalize tool name → module ID + optional Nango provider.
export const TOOL_MODULE_MAP: Record<string, ToolMapping> = {
  // Tasks
  asana: { moduleId: "TASKS", nangoProvider: "asana" },
  monday: { moduleId: "TASKS", nangoProvider: "monday" },
  "monday.com": { moduleId: "TASKS", nangoProvider: "monday" },
  trello: { moduleId: "TASKS" },
  notion: { moduleId: "TASKS" },
  jira: { moduleId: "TASKS" },
  todoist: { moduleId: "TASKS" },
  clickup: { moduleId: "TASKS" },
  spreadsheets: { moduleId: "TASKS" },
  "google sheets": { moduleId: "TASKS" },
  excel: { moduleId: "TASKS" },
  // Projects
  basecamp: { moduleId: "PROJECTS" },
  smartsheet: { moduleId: "PROJECTS" },
  "ms project": { moduleId: "PROJECTS" },
  "microsoft project": { moduleId: "PROJECTS" },
  wrike: { moduleId: "PROJECTS" },
  teamwork: { moduleId: "PROJECTS" },
  // CRM
  hubspot: { moduleId: "CRM", nangoProvider: "hubspot" },
  salesforce: { moduleId: "CRM" },
  pipedrive: { moduleId: "CRM" },
  zoho: { moduleId: "CRM" },
  "zoho crm": { moduleId: "CRM" },
  close: { moduleId: "CRM" },
  // Content / Creative
  canva: { moduleId: "CONTENT_STUDIO" },
  figma: { moduleId: "CONTENT_STUDIO", nangoProvider: "figma" },
  "google drive": { moduleId: "CONTENT_STUDIO", nangoProvider: "google-drive" },
  dropbox: { moduleId: "CONTENT_STUDIO" },
  adobe: { moduleId: "CONTENT_STUDIO" },
  // Communication
  slack: { moduleId: "COMMUNICATION", nangoProvider: "slack" },
  whatsapp: { moduleId: "COMMUNICATION", nangoProvider: "whatsapp-business" },
  teams: { moduleId: "COMMUNICATION" },
  "microsoft teams": { moduleId: "COMMUNICATION" },
  discord: { moduleId: "COMMUNICATION" },
  telegram: { moduleId: "COMMUNICATION" },
  email: { moduleId: "COMMUNICATION" },
  // Finance
  xero: { moduleId: "FINANCE", nangoProvider: "xero" },
  quickbooks: { moduleId: "FINANCE", nangoProvider: "quickbooks" },
  freshbooks: { moduleId: "FINANCE" },
  wave: { moduleId: "FINANCE" },
  sage: { moduleId: "FINANCE" },
  // Time tracking
  toggl: { moduleId: "TIME_LEAVE", nangoProvider: "toggl" },
  harvest: { moduleId: "TIME_LEAVE" },
  clockify: { moduleId: "TIME_LEAVE" },
  timely: { moduleId: "TIME_LEAVE" },
  // Social
  hootsuite: { moduleId: "SOCIAL_PUBLISHING" },
  buffer: { moduleId: "SOCIAL_PUBLISHING" },
  later: { moduleId: "SOCIAL_PUBLISHING" },
  "sprout social": { moduleId: "SOCIAL_PUBLISHING" },
  sproutsocial: { moduleId: "SOCIAL_PUBLISHING" },
  // Analytics
  "google analytics": { moduleId: "ANALYTICS" },
  mixpanel: { moduleId: "ANALYTICS" },
  amplitude: { moduleId: "ANALYTICS" },
  tableau: { moduleId: "ANALYTICS" },
};

export function resolveModule(toolName: string): ModuleInfo | null {
  const normalized = toolName.trim().toLowerCase();
  const mapping = TOOL_MODULE_MAP[normalized];
  if (!mapping) return null;
  return MODULE_REGISTRY[mapping.moduleId] ?? null;
}

export function resolveToolMapping(toolName: string): ToolMapping | null {
  const normalized = toolName.trim().toLowerCase();
  return TOOL_MODULE_MAP[normalized] ?? null;
}
