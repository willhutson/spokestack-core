export const INDUSTRY_INTEGRATIONS: Record<string, string[]> = {
  pr_agency: ["google_drive", "gmail", "hubspot"],
  creative_agency: ["google_drive", "slack", "figma"],
  saas: ["slack", "github", "hubspot"],
  ecommerce: ["google_drive", "hubspot", "quickbooks"],
  consulting: ["google_drive", "slack", "hubspot"],
  law_firm: ["google_drive", "hubspot"],
  construction: ["google_drive", "hubspot", "quickbooks"],
};

export const INTEGRATION_METADATA: Record<
  string,
  {
    name: string;
    description: string;
    whatWeRead: string;
    nangoProviderKey: string;
  }
> = {
  google_drive: {
    name: "Google Drive",
    description: "Scan your folders to detect clients and projects",
    whatWeRead: "Top-level folder names only — no file contents",
    nangoProviderKey: "google_drive",
  },
  slack: {
    name: "Slack",
    description: "Read your channel structure to map your team and clients",
    whatWeRead: "Channel names and member counts only",
    nangoProviderKey: "slack",
  },
  hubspot: {
    name: "HubSpot",
    description: "Import your companies and contacts",
    whatWeRead: "Company names, contact names, and deal stages",
    nangoProviderKey: "hubspot",
  },
  gmail: {
    name: "Gmail",
    description:
      "Connect your email for media and client correspondence",
    whatWeRead:
      "Sender names from recent threads (subject lines remain private)",
    nangoProviderKey: "google",
  },
  figma: {
    name: "Figma",
    description: "Detect project files and design assets",
    whatWeRead: "Project and file names only",
    nangoProviderKey: "figma",
  },
  github: {
    name: "GitHub",
    description: "Connect repositories to your agent context",
    whatWeRead: "Repository names and recent activity",
    nangoProviderKey: "github",
  },
  quickbooks: {
    name: "QuickBooks",
    description: "Connect accounting data for financial context",
    whatWeRead: "Customer names and invoice statuses",
    nangoProviderKey: "quickbooks",
  },
};
