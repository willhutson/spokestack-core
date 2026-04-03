import { get } from "../api.js";
import * as ui from "../ui.js";

interface AnalyticsOpts {
  json?: boolean;
}

interface AnalyticsData {
  moduleId: string;
  name: string;
  totalInstalls: number;
  activeInstalls: number;
  installsThisWeek: number;
  churnRate: number;
  avgRating: number;
  reviewCount: number;
  totalRevenueCents: number;
  totalRevenueFormatted: string;
  recentBillingEvents: Array<{
    amountCents: number;
    publisherShareCents: number;
    type: string;
    createdAt: string;
  }>;
}

export async function moduleAnalyticsCommand(
  slugOrId: string,
  opts: AnalyticsOpts
): Promise<void> {
  const s = ui.spinner("Loading analytics...");

  // Look up the module to get its ID
  const moduleRes = await get<{ id: string; name: string }>(
    `/api/v1/marketplace/${slugOrId}`
  );

  if (!moduleRes.ok) {
    s.stop();
    ui.error(moduleRes.error || "Module not found");
    process.exit(1);
  }

  const moduleId = moduleRes.data.id;

  const analyticsRes = await get<AnalyticsData>(
    `/api/v1/marketplace/analytics/${moduleId}`
  );

  s.stop();

  if (!analyticsRes.ok) {
    ui.error(analyticsRes.error || "Failed to load analytics");
    process.exit(1);
  }

  const data = analyticsRes.data;

  if (opts.json) {
    ui.jsonOutput(data);
    return;
  }

  const trend =
    data.installsThisWeek > 0
      ? ` ${ui.SUCCESS(`(↑${data.installsThisWeek} this week)`)}`
      : "";
  const churnPct = (data.churnRate * 100).toFixed(1);

  ui.blank();
  ui.line(`  ${ui.BOLD(data.name)}`);
  ui.divider();
  ui.line(`  Installs: ${data.totalInstalls}${trend}`);
  ui.line(`  Active:   ${data.activeInstalls}`);
  ui.line(`  Revenue:  ${data.totalRevenueFormatted}`);
  ui.line(
    `  Rating:   ${data.avgRating.toFixed(1)}/5 (${data.reviewCount} reviews)`
  );
  ui.line(`  Churn:    ${churnPct}%`);

  if (data.recentBillingEvents && data.recentBillingEvents.length > 0) {
    ui.blank();
    ui.line(`  ${ui.BOLD("Recent billing events:")}`);
    for (const event of data.recentBillingEvents.slice(0, 5)) {
      const amount = ui.formatCurrency(event.publisherShareCents, "AED");
      const date = ui.formatDate(event.createdAt);
      ui.line(
        `    ${event.type.padEnd(8)} ${amount.padEnd(14)} ${date}`
      );
    }
  }

  ui.blank();
}
