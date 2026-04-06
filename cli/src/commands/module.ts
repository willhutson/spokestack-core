import { Command } from "commander";
import inquirer from "inquirer";
import { get, post, del } from "../api.js";
import * as ui from "../ui.js";
import { moduleCreateCommand } from "./module-create.js";
import { moduleTestCommand } from "./module-test.js";
import { modulePublishCommand } from "./module-publish.js";
import { moduleAnalyticsCommand } from "./module-analytics.js";
import { moduleSyncCommand } from "./module-sync.js";

interface Module {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  agentName: string;
  category: string;
  installed?: boolean;
}

export function registerModuleCommand(program: Command): void {
  const module = program
    .command("module")
    .description("Browse and manage marketplace modules");

  // ── module create ────────────────────────────────────────────────

  module
    .command("create [name]")
    .description("Scaffold a new module interactively or from flags")
    .option("--name <name>", "Module name")
    .option("--slug <slug>", "URL slug in kebab-case")
    .option("--type <type>", "Module type in UPPER_SNAKE_CASE")
    .option("--entity <entity>", "Primary entity name, singular")
    .option("--entities <list>", "Comma-separated entity fields")
    .option("--category <category>", "Category")
    .option("--industry <industry>", "Industry vertical")
    .option("--output <dir>", "Output directory")
    .option("--yes", "Skip all confirmations")
    .option("--json", "Output JSON")
    .action(moduleCreateCommand);

  // ── module test ──────────────────────────────────────────────────

  module
    .command("test <slug>")
    .description("Validate and test a module before publishing")
    .option("--skip-execution", "Skip sandbox tool execution")
    .option("--verbose", "Show per-tool status codes and timing")
    .option("--json", "Output test results as JSON")
    .action(moduleTestCommand);

  // ── module publish ───────────────────────────────────────────────

  module
    .command("publish <slug>")
    .description("Publish a module to the SpokeStack Marketplace")
    .option("--price <cents>", "One-time price in cents (e.g. 4900 = AED 49)")
    .option("--monthly-price <cents>", "Monthly subscription price in cents")
    .option("--yes", "Skip confirmation prompt")
    .option("--json", "Output result as JSON")
    .action(modulePublishCommand);

  // ── module analytics ─────────────────────────────────────────────

  module
    .command("analytics <slug>")
    .description("View install, revenue, and rating analytics for a published module")
    .option("--json", "Output analytics as JSON")
    .action(moduleAnalyticsCommand);

  // ── module sync ──────────────────────────────────────────────────

  module
    .command("sync [module]")
    .description("Sync tool definitions from agent builder registry")
    .option("--url <url>", "Agent builder base URL")
    .option("--validate", "Validate tool definitions after syncing")
    .option("--json", "Output JSON")
    .action(moduleSyncCommand);

  // ── module list ───────────────────────────────────────────────────

  module
    .command("list")
    .description("Browse available marketplace modules")
    .option("--installed", "Show only installed modules")
    .option("--format <fmt>", "Output format: table, json", "table")
    .action(async (opts) => {
      const s = ui.spinner("Loading modules...");
      const params = new URLSearchParams();
      if (opts.installed) params.set("installed", "true");

      const queryStr = params.toString();
      const path = `/api/v1/modules${queryStr ? `?${queryStr}` : ""}`;
      const res = await get<{ modules: Module[] }>(path);
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const modules = res.data.modules;

      if (opts.format === "json") {
        ui.jsonOutput(modules);
        return;
      }

      ui.heading(`Marketplace Modules (${modules.length})`);

      if (modules.length === 0) {
        ui.line(ui.MUTED("No modules available yet. Check back soon."));
        ui.blank();
        return;
      }

      ui.table(
        [
          { key: "slug", label: "Module", width: 18 },
          { key: "name", label: "Name", width: 22 },
          {
            key: "priceCents",
            label: "Price",
            width: 10,
            align: "right" as const,
            format: (v) => {
              const cents = v as number;
              return `${ui.formatCurrency(cents)}/mo`;
            },
          },
          { key: "agentName", label: "Agent", width: 18 },
          {
            key: "installed",
            label: "Status",
            width: 10,
            format: (v) =>
              v ? ui.SUCCESS("installed") : ui.MUTED("available"),
          },
        ],
        modules
      );

      ui.blank();
      ui.line(`  Install: ${ui.BOLD("spokestack module add <slug>")}`);
      ui.blank();
    });

  // ── module add ────────────────────────────────────────────────────

  module
    .command("add <slug>")
    .description("Install a marketplace module")
    .option("--yes", "Skip confirmation prompt")
    .action(async (slug: string, opts: { yes?: boolean }) => {
      if (!opts.yes) {
        const { confirm } = await inquirer.prompt([
          { type: "confirm", name: "confirm", message: `Install module "${slug}"?`, default: true },
        ]);
        if (!confirm) { ui.info("Cancelled."); return; }
      }

      const s = ui.spinner(`Installing ${slug}...`);
      const res = await post<{ module: Module; message: string }>(
        "/api/v1/modules/install",
        { moduleType: slug.toUpperCase().replace(/-/g, "_") }
      );
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const m = res.data.module;
      ui.success(`Module installed: ${ui.BOLD(m.name)}`);
      ui.line(`  Agent: ${ui.BOLD(m.agentName)} is now active in your workspace.`);
      ui.line(`  Price: ${ui.formatCurrency(m.priceCents)}/mo added to your subscription.`);
      ui.blank();
      ui.line(`  Talk to your new agent: ${ui.BOLD("spokestack agent chat")}`);
      ui.blank();
    });

  // ── module remove ─────────────────────────────────────────────────

  module
    .command("remove <slug>")
    .description("Uninstall a marketplace module")
    .option("--yes", "Skip confirmation prompt")
    .action(async (slug: string, opts: { yes?: boolean }) => {
      if (!opts.yes) {
        const { confirm } = await inquirer.prompt([
          { type: "confirm", name: "confirm", message: `Remove module "${slug}"? Your data will be preserved.`, default: false },
        ]);
        if (!confirm) { ui.info("Cancelled."); return; }
      }

      const s = ui.spinner(`Removing ${slug}...`);
      const res = await post<{ message: string }>(
        `/api/v1/modules/${slug.toUpperCase().replace(/-/g, "_")}/uninstall`,
        {}
      );
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      ui.success(`Module removed: ${ui.BOLD(slug)}`);
      ui.line(`  The module agent has been deactivated. Your data is preserved.`);
      ui.blank();
    });
}
