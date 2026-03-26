import { Command } from "commander";
import { get } from "../api.js";
import { loadAuth } from "../auth.js";
import * as ui from "../ui.js";

interface WorkspaceStatus {
  organization: {
    name: string;
    slug: string;
    memberCount: number;
  };
  billing: {
    tier: string;
    status: string;
  };
  stats: {
    tasks: { total: number; todo: number; inProgress: number; done: number };
    projects: { total: number; active: number; completed: number };
    briefs: { total: number; active: number };
    orders: { total: number; pending: number };
    contextEntries: number;
  };
  agents: Array<{
    type: string;
    name: string;
    available: boolean;
    requiredTier?: string;
  }>;
  modules: Array<{
    name: string;
    slug: string;
    active: boolean;
  }>;
}

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show workspace health and agent stats")
    .option("--format <fmt>", "Output format: table, json", "table")
    .action(async (opts) => {
      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in. Run `spokestack login` first.");
        process.exit(1);
      }

      const s = ui.spinner("Loading workspace status...");
      const res = await get<WorkspaceStatus>("/api/v1/status");
      s.stop();

      if (ui.handleError(res.error)) {
        process.exit(1);
      }

      const data = res.data;

      if (opts.format === "json") {
        ui.jsonOutput(data);
        return;
      }

      // Workspace header
      ui.welcomeBanner(data.organization.name);

      // Billing
      ui.line(`  ${ui.BOLD("Plan:")}     ${data.billing.tier} ${ui.statusBadge(data.billing.status)}`);
      ui.line(`  ${ui.BOLD("Members:")}  ${data.organization.memberCount}`);
      ui.line(`  ${ui.BOLD("Context:")}  ${data.stats.contextEntries} entries ${ui.MUTED("(compounding weekly)")}`);
      ui.blank();

      // Task stats
      ui.divider();
      ui.line(`  ${ui.BOLD("Tasks")}`);
      ui.line(`    Total: ${data.stats.tasks.total}  |  To-do: ${data.stats.tasks.todo}  |  In progress: ${data.stats.tasks.inProgress}  |  Done: ${data.stats.tasks.done}`);
      ui.blank();

      // Project stats (if available)
      if (data.stats.projects.total > 0) {
        ui.line(`  ${ui.BOLD("Projects")}`);
        ui.line(`    Total: ${data.stats.projects.total}  |  Active: ${data.stats.projects.active}  |  Completed: ${data.stats.projects.completed}`);
        ui.blank();
      }

      // Brief stats (if available)
      if (data.stats.briefs.total > 0) {
        ui.line(`  ${ui.BOLD("Briefs")}`);
        ui.line(`    Total: ${data.stats.briefs.total}  |  Active: ${data.stats.briefs.active}`);
        ui.blank();
      }

      // Order stats (if available)
      if (data.stats.orders.total > 0) {
        ui.line(`  ${ui.BOLD("Orders")}`);
        ui.line(`    Total: ${data.stats.orders.total}  |  Pending: ${data.stats.orders.pending}`);
        ui.blank();
      }

      // Agents
      ui.divider();
      ui.line(`  ${ui.BOLD("Agents")}`);
      ui.blank();
      for (const agent of data.agents) {
        if (agent.available) {
          ui.line(`    ${ui.SUCCESS("\u2714")} ${ui.BOLD(agent.name)} ${ui.MUTED("active")}`);
        } else {
          ui.line(`    ${ui.MUTED("\u25CB")} ${agent.name} ${ui.MUTED(`requires ${agent.requiredTier || "upgrade"}`)}`);
        }
      }
      ui.blank();

      // Installed modules
      if (data.modules.length > 0) {
        ui.divider();
        ui.line(`  ${ui.BOLD("Installed Modules")}`);
        ui.blank();
        for (const mod of data.modules) {
          const status = mod.active ? ui.SUCCESS("active") : ui.WARNING("inactive");
          ui.line(`    ${mod.name} ${ui.MUTED(`(${mod.slug})`)} ${status}`);
        }
        ui.blank();
      }

      // Quick actions
      ui.divider();
      ui.line(`  ${ui.BOLD("Quick Actions")}`);
      ui.line(`    ${ui.BOLD("spokestack task add")}       Create a task`);
      ui.line(`    ${ui.BOLD("spokestack agent chat")}     Talk to your agent`);
      ui.line(`    ${ui.BOLD("spokestack upgrade")}        Unlock more agents`);
      ui.blank();
    });
}
