export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  category: "profile" | "team" | "modules" | "data";
  weight: number;
  checkEndpoint: string;
  checkFn: (data: unknown) => boolean;
  actionLabel: string;
  actionHref: string;
}

export const SETUP_CHECKLIST: ChecklistItem[] = [
  // Profile
  {
    id: "org_name",
    label: "Set your organization name",
    description:
      "Give your workspace a name so your team knows where they are.",
    category: "profile",
    weight: 2,
    checkEndpoint: "/api/v1/settings",
    checkFn: (data: any) => {
      const s = data?.settings ?? data;
      return (
        !!s?.timezone &&
        s.timezone !== "UTC" &&
        !!s?.organizationId
      );
    },
    actionLabel: "Settings",
    actionHref: "/settings",
  },
  {
    id: "timezone",
    label: "Set your timezone",
    description:
      "Ensure dates and deadlines show correctly for your region.",
    category: "profile",
    weight: 2,
    checkEndpoint: "/api/v1/settings",
    checkFn: (data: any) => {
      const s = data?.settings ?? data;
      return !!s?.timezone && s.timezone !== "UTC";
    },
    actionLabel: "Settings",
    actionHref: "/settings",
  },
  // Team
  {
    id: "invite_member",
    label: "Invite a team member",
    description:
      "SpokeStack works better with your team. Invite at least one person.",
    category: "team",
    weight: 3,
    checkEndpoint: "/api/v1/members",
    checkFn: (data: any) => {
      const members = data?.members ?? (Array.isArray(data) ? data : []);
      return members.length > 1;
    },
    actionLabel: "Invite",
    actionHref: "/settings",
  },
  // Modules
  {
    id: "install_module",
    label: "Install your first marketplace module",
    description:
      "Extend SpokeStack with CRM, Finance, Content Studio, and more.",
    category: "modules",
    weight: 2,
    checkEndpoint: "/api/v1/modules/installed",
    checkFn: (data: any) => {
      const modules = data?.installed ?? (Array.isArray(data) ? data : []);
      const coreIds = new Set([
        "TASKS",
        "PROJECTS",
        "BRIEFS",
        "ORDERS",
      ]);
      return modules.some(
        (m: any) =>
          m.active &&
          !coreIds.has(
            (m.moduleType ?? m.id ?? "").toUpperCase()
          )
      );
    },
    actionLabel: "Marketplace",
    actionHref: "/marketplace",
  },
  // Data
  {
    id: "first_task",
    label: "Create your first task",
    description:
      "Try creating a task — type it in the chat or use the Tasks page.",
    category: "data",
    weight: 3,
    checkEndpoint: "/api/v1/tasks",
    checkFn: (data: any) => {
      const items = data?.tasks ?? (Array.isArray(data) ? data : []);
      return items.length > 0;
    },
    actionLabel: "Tasks",
    actionHref: "/tasks",
  },
  {
    id: "first_project",
    label: "Create your first project",
    description:
      "Projects help you organize tasks into larger workstreams.",
    category: "data",
    weight: 2,
    checkEndpoint: "/api/v1/projects",
    checkFn: (data: any) => {
      const items = data?.projects ?? (Array.isArray(data) ? data : []);
      return items.length > 0;
    },
    actionLabel: "Projects",
    actionHref: "/projects",
  },
  {
    id: "first_brief",
    label: "Create your first brief",
    description:
      "Briefs capture client requirements and creative direction.",
    category: "data",
    weight: 1,
    checkEndpoint: "/api/v1/briefs",
    checkFn: (data: any) => {
      const items = data?.briefs ?? (Array.isArray(data) ? data : []);
      return items.length > 0;
    },
    actionLabel: "Briefs",
    actionHref: "/briefs",
  },
  {
    id: "ask_agent",
    label: "Ask the agent something",
    description:
      "Try the chat — ask it to create a task, summarize a project, or just say hello.",
    category: "data",
    weight: 3,
    checkEndpoint: "/api/v1/context?entryType=ENTITY",
    checkFn: (data: any) => {
      const items = data?.entries ?? (Array.isArray(data) ? data : []);
      return items.length > 0;
    },
    actionLabel: "Chat",
    actionHref: "/tasks",
  },
];

export function calculateCompleteness(
  results: Record<string, boolean>
): number {
  let totalWeight = 0;
  let completedWeight = 0;

  for (const item of SETUP_CHECKLIST) {
    totalWeight += item.weight;
    if (results[item.id]) {
      completedWeight += item.weight;
    }
  }

  return totalWeight > 0
    ? Math.round((completedWeight / totalWeight) * 100)
    : 0;
}
