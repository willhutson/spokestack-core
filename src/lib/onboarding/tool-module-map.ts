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

// Normalize tool name → module ID. Keys are all lowercase.
export const TOOL_MODULE_MAP: Record<string, string> = {
  // Tasks
  asana: "TASKS",
  monday: "TASKS",
  "monday.com": "TASKS",
  trello: "TASKS",
  notion: "TASKS",
  jira: "TASKS",
  todoist: "TASKS",
  clickup: "TASKS",
  spreadsheets: "TASKS",
  "google sheets": "TASKS",
  excel: "TASKS",
  // Projects
  basecamp: "PROJECTS",
  smartsheet: "PROJECTS",
  "ms project": "PROJECTS",
  "microsoft project": "PROJECTS",
  wrike: "PROJECTS",
  teamwork: "PROJECTS",
  // CRM
  hubspot: "CRM",
  salesforce: "CRM",
  pipedrive: "CRM",
  zoho: "CRM",
  "zoho crm": "CRM",
  close: "CRM",
  // Content / Creative
  canva: "CONTENT_STUDIO",
  figma: "CONTENT_STUDIO",
  "google drive": "CONTENT_STUDIO",
  dropbox: "CONTENT_STUDIO",
  adobe: "CONTENT_STUDIO",
  // Communication
  slack: "COMMUNICATION",
  whatsapp: "COMMUNICATION",
  teams: "COMMUNICATION",
  "microsoft teams": "COMMUNICATION",
  discord: "COMMUNICATION",
  telegram: "COMMUNICATION",
  email: "COMMUNICATION",
  // Finance
  xero: "FINANCE",
  quickbooks: "FINANCE",
  freshbooks: "FINANCE",
  wave: "FINANCE",
  sage: "FINANCE",
  // Time tracking
  toggl: "TIME_LEAVE",
  harvest: "TIME_LEAVE",
  clockify: "TIME_LEAVE",
  timely: "TIME_LEAVE",
  // Social
  hootsuite: "SOCIAL_PUBLISHING",
  buffer: "SOCIAL_PUBLISHING",
  later: "SOCIAL_PUBLISHING",
  "sprout social": "SOCIAL_PUBLISHING",
  sproutsocial: "SOCIAL_PUBLISHING",
  // Analytics
  "google analytics": "ANALYTICS",
  mixpanel: "ANALYTICS",
  amplitude: "ANALYTICS",
  tableau: "ANALYTICS",
};

export function resolveModule(toolName: string): ModuleInfo | null {
  const normalized = toolName.trim().toLowerCase();
  const moduleId = TOOL_MODULE_MAP[normalized];
  if (!moduleId) return null;
  return MODULE_REGISTRY[moduleId] ?? null;
}
