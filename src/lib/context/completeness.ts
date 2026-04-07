import { prisma } from "@/lib/prisma";

export interface CompletenessResult {
  score: number;
  breakdown: {
    category: string;
    label: string;
    count: number;
    target: number;
    satisfied: boolean;
  }[];
  suggestions: string[];
  integrationsSuggested: string[];
}

interface Target {
  category: string;
  label: string;
  target: number;
  suggestion: string;
  integrationHint?: string;
}

const INDUSTRY_TARGETS: Record<string, Target[]> = {
  pr_agency: [
    { category: "journalist", label: "Journalists", target: 5, suggestion: "Add 5+ journalists to your media list", integrationHint: "google_drive" },
    { category: "client", label: "Clients", target: 2, suggestion: "Add your active clients", integrationHint: "hubspot" },
    { category: "google_drive_folder", label: "Drive folders", target: 1, suggestion: "Connect Google Drive to detect client folders", integrationHint: "google_drive" },
    { category: "integration_status", label: "Integrations", target: 1, suggestion: "Connect at least one integration" },
    { category: "org_context", label: "Org preferences", target: 3, suggestion: "Complete your workspace preferences" },
  ],
  creative_agency: [
    { category: "client", label: "Clients", target: 2, suggestion: "Add your active clients", integrationHint: "hubspot" },
    { category: "campaign", label: "Active campaigns", target: 1, suggestion: "Add your current campaigns" },
    { category: "slack_channel", label: "Slack channels", target: 1, suggestion: "Connect Slack to map your team structure", integrationHint: "slack" },
    { category: "org_context", label: "Org preferences", target: 3, suggestion: "Complete your workspace preferences" },
  ],
  saas: [
    { category: "product", label: "Product context", target: 1, suggestion: "Add your product and target user information" },
    { category: "competitor", label: "Competitors", target: 2, suggestion: "Add your main competitors" },
    { category: "slack_channel", label: "Slack channels", target: 1, suggestion: "Connect Slack to map your team and projects", integrationHint: "slack" },
    { category: "org_context", label: "Org preferences", target: 3, suggestion: "Complete your workspace preferences" },
  ],
  consulting: [
    { category: "client", label: "Clients", target: 2, suggestion: "Add your active client engagements", integrationHint: "hubspot" },
    { category: "google_drive_folder", label: "Drive folders", target: 1, suggestion: "Connect Google Drive to detect client folders", integrationHint: "google_drive" },
    { category: "org_context", label: "Org preferences", target: 3, suggestion: "Complete your workspace preferences" },
  ],
  law_firm: [
    { category: "client", label: "Clients", target: 2, suggestion: "Add your active client matters", integrationHint: "hubspot" },
    { category: "matter", label: "Active matters", target: 2, suggestion: "Add your current matters" },
    { category: "google_drive_folder", label: "Drive folders", target: 1, suggestion: "Connect Google Drive to detect matter folders", integrationHint: "google_drive" },
    { category: "org_context", label: "Org preferences", target: 3, suggestion: "Complete your workspace preferences" },
  ],
  construction: [
    { category: "project", label: "Projects", target: 2, suggestion: "Add your active construction projects" },
    { category: "vendor", label: "Vendors", target: 3, suggestion: "Add your key subcontractors and suppliers" },
    { category: "org_context", label: "Org preferences", target: 3, suggestion: "Complete your workspace preferences" },
  ],
  ecommerce: [
    { category: "product", label: "Products", target: 3, suggestion: "Add your product catalogue context" },
    { category: "customer_segment", label: "Customer segments", target: 1, suggestion: "Add your key customer segments" },
    { category: "company", label: "Companies (HubSpot)", target: 1, suggestion: "Connect HubSpot to import contacts", integrationHint: "hubspot" },
    { category: "org_context", label: "Org preferences", target: 3, suggestion: "Complete your workspace preferences" },
  ],
};

export async function getContextCompleteness(
  orgId: string,
  industry: string
): Promise<CompletenessResult> {
  const targets = INDUSTRY_TARGETS[industry] ?? INDUSTRY_TARGETS.consulting;

  const categoryCounts = await prisma.contextEntry.groupBy({
    by: ["category"],
    where: { organizationId: orgId },
    _count: { id: true },
  });

  const countMap = Object.fromEntries(
    categoryCounts.map((r) => [r.category, r._count.id])
  );

  const breakdown = targets.map((t) => ({
    category: t.category,
    label: t.label,
    count: countMap[t.category] ?? 0,
    target: t.target,
    satisfied: (countMap[t.category] ?? 0) >= t.target,
  }));

  const satisfied = breakdown.filter((b) => b.satisfied).length;
  const score =
    breakdown.length > 0
      ? Math.round((satisfied / breakdown.length) * 100)
      : 0;

  const suggestions = breakdown
    .filter((b) => !b.satisfied)
    .map((b) => targets.find((t) => t.category === b.category)!.suggestion)
    .slice(0, 3);

  const integrationsSuggested = [
    ...new Set(
      breakdown
        .filter((b) => !b.satisfied)
        .map(
          (b) =>
            targets.find((t) => t.category === b.category)!.integrationHint
        )
        .filter((h): h is string => !!h)
    ),
  ].slice(0, 2);

  return { score, breakdown, suggestions, integrationsSuggested };
}
