export interface RoleTemplate {
  id: string;
  label: string;
  recommendedModules: string[];
  roles: Array<{ name: string; slug: string; permissions: string[] }>;
}

export const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  agency: {
    id: "agency", label: "Agency",
    recommendedModules: ["briefs", "crm", "projects", "time", "mission_control"],
    roles: [
      { name: "Account Manager", slug: "account_manager", permissions: ["briefs:read", "briefs:write", "crm:read", "crm:write"] },
      { name: "Creative Director", slug: "creative_director", permissions: ["briefs:read", "briefs:write", "projects:read"] },
      { name: "Designer", slug: "designer", permissions: ["briefs:read", "tasks:read", "tasks:write"] },
      { name: "Copywriter", slug: "copywriter", permissions: ["briefs:read", "tasks:read", "tasks:write"] },
    ],
  },
  saas: {
    id: "saas", label: "SaaS",
    recommendedModules: ["tasks", "projects", "analytics", "crm", "mission_control"],
    roles: [
      { name: "Product Manager", slug: "product_manager", permissions: ["tasks:read", "tasks:write", "projects:read", "projects:write"] },
      { name: "Engineer", slug: "engineer", permissions: ["tasks:read", "tasks:write"] },
      { name: "Designer", slug: "designer", permissions: ["tasks:read", "tasks:write", "briefs:read"] },
      { name: "Customer Success", slug: "customer_success", permissions: ["crm:read", "crm:write"] },
    ],
  },
  ecommerce: {
    id: "ecommerce", label: "E-commerce",
    recommendedModules: ["crm", "analytics", "tasks", "time"],
    roles: [
      { name: "Operations Manager", slug: "ops_manager", permissions: ["crm:read", "crm:write", "tasks:read", "tasks:write"] },
      { name: "Customer Service", slug: "customer_service", permissions: ["crm:read", "crm:write"] },
      { name: "Marketing", slug: "marketing", permissions: ["briefs:read", "briefs:write", "analytics:read"] },
    ],
  },
  custom: {
    id: "custom", label: "Other / Custom",
    recommendedModules: ["tasks", "projects"],
    roles: [
      { name: "Admin", slug: "admin", permissions: ["*"] },
      { name: "Member", slug: "member", permissions: ["tasks:read", "tasks:write"] },
    ],
  },
};
