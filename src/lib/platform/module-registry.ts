export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: "CORE" | "OPERATIONS" | "GROWTH" | "INTELLIGENCE";
  isCore: boolean;
  minPlan: "STARTER" | "PRO" | "ENTERPRISE";
  dependencies: string[];
  features: string[];
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  { id: "hub", name: "Hub", description: "Central dashboard and activity feed", category: "CORE", isCore: true, minPlan: "STARTER", dependencies: [], features: ["Dashboard", "Activity feed", "Quick actions"] },
  { id: "admin", name: "Admin", description: "Organization settings and user management", category: "CORE", isCore: true, minPlan: "STARTER", dependencies: [], features: ["Users", "Roles", "Settings"] },
  { id: "team", name: "Team", description: "Team directory and org chart", category: "CORE", isCore: true, minPlan: "STARTER", dependencies: [], features: ["Directory", "Org chart", "Profiles"] },
  { id: "tasks", name: "Tasks", description: "Task management and kanban boards", category: "OPERATIONS", isCore: false, minPlan: "STARTER", dependencies: [], features: ["Kanban", "Assignments", "Due dates"] },
  { id: "projects", name: "Projects", description: "Project tracking and milestones", category: "OPERATIONS", isCore: false, minPlan: "STARTER", dependencies: ["tasks"], features: ["Milestones", "Timelines", "Status tracking"] },
  { id: "briefs", name: "Briefs", description: "Creative briefs and content requests", category: "OPERATIONS", isCore: false, minPlan: "STARTER", dependencies: [], features: ["Brief templates", "Approval flows", "Comments"] },
  { id: "crm", name: "CRM", description: "Client and contact management", category: "OPERATIONS", isCore: false, minPlan: "STARTER", dependencies: [], features: ["Contacts", "Deals", "Pipeline"] },
  { id: "analytics", name: "Analytics", description: "Business intelligence and reporting", category: "INTELLIGENCE", isCore: false, minPlan: "PRO", dependencies: [], features: ["Dashboards", "Reports", "Exports"] },
  { id: "time", name: "Time & Leave", description: "Time tracking and leave management", category: "OPERATIONS", isCore: false, minPlan: "STARTER", dependencies: [], features: ["Timesheets", "Leave requests", "Approvals"] },
  { id: "mission_control", name: "Mission Control", description: "AI agent orchestration interface", category: "INTELLIGENCE", isCore: false, minPlan: "PRO", dependencies: [], features: ["Agent chat", "Artifacts", "Command palette"] },
];

export function checkModuleDependencies(moduleId: string, enabledModules: string[]): { satisfied: boolean; missing: string[] } {
  const mod = MODULE_REGISTRY.find((m) => m.id === moduleId);
  if (!mod) return { satisfied: true, missing: [] };
  const missing = mod.dependencies.filter((dep) => !enabledModules.includes(dep));
  return { satisfied: missing.length === 0, missing };
}

export function getDependentModules(moduleId: string, enabledModules: string[]): ModuleDefinition[] {
  return MODULE_REGISTRY.filter((m) => m.dependencies.includes(moduleId) && enabledModules.includes(m.id));
}
