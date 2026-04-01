import type { NangoProvider } from "./types";

const providers: NangoProvider[] = [
  {
    id: "asana",
    module: "TASKS",
    scopes: ["default"],
    displayName: "Asana",
  },
  {
    id: "hubspot",
    module: "CRM",
    scopes: ["crm.objects.contacts.read", "crm.objects.deals.read"],
    displayName: "HubSpot",
  },
  {
    id: "slack",
    module: "COMMUNICATION",
    scopes: ["chat:write", "channels:read", "users:read"],
    displayName: "Slack",
  },
  {
    id: "google-drive",
    module: "CONTENT_STUDIO",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    displayName: "Google Drive",
  },
  {
    id: "google-calendar",
    module: "WORKFLOWS",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    displayName: "Google Calendar",
  },
  {
    id: "monday",
    module: "TASKS",
    scopes: ["boards:read", "updates:read"],
    displayName: "Monday.com",
  },
  {
    id: "xero",
    module: "FINANCE",
    scopes: ["accounting.transactions.read", "accounting.contacts.read"],
    displayName: "Xero",
  },
  {
    id: "quickbooks",
    module: "FINANCE",
    scopes: ["com.intuit.quickbooks.accounting"],
    displayName: "QuickBooks",
  },
  {
    id: "figma",
    module: "CONTENT_STUDIO",
    scopes: ["files:read"],
    displayName: "Figma",
  },
  {
    id: "toggl",
    module: "TIME_LEAVE",
    scopes: ["default"],
    displayName: "Toggl",
  },
  {
    id: "linkedin",
    module: "SOCIAL_PUBLISHING",
    scopes: ["r_liteprofile", "w_member_social"],
    displayName: "LinkedIn",
  },
  {
    id: "facebook",
    module: "SOCIAL_PUBLISHING",
    scopes: ["pages_manage_posts", "pages_read_engagement"],
    displayName: "Facebook",
  },
  {
    id: "whatsapp-business",
    module: "COMMUNICATION",
    scopes: ["whatsapp_business_messaging"],
    displayName: "WhatsApp Business",
  },
];

const providerMap = new Map(providers.map((p) => [p.id, p]));

export function getProvider(id: string): NangoProvider | undefined {
  return providerMap.get(id);
}

export function getProvidersForModule(moduleType: string): NangoProvider[] {
  return providers.filter((p) => p.module === moduleType);
}

export function getAllProviders(): NangoProvider[] {
  return [...providers];
}
