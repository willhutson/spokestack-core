import { Command } from "commander";
import { apiRequest } from "../api.js";
import * as ui from "../ui.js";

interface RegistryModule {
  moduleType: string;
  name: string;
  description: string;
  category: string;
  minTier: string;
  price: number | null;
  agentName: string;
}

interface InstalledModule {
  moduleType: string;
  name: string;
  active: boolean;
}

export function registerModulesCommand(program: Command): void {
  const modules = program
    .command("modules")
    .description("Manage workspace modules (spoke modules)");

  // ── modules list ──────────────────────────────────────────────────

  modules
    .command("list")
    .description("List all available modules with install status")
    .option("--format <fmt>", "Output format: table, json", "table")
    .action(async (opts) => {
      const s = ui.spinner("Loading modules...");

      const [allRes, installedRes] = await Promise.all([
        apiRequest<{ modules: RegistryModule[] }>("GET", "/api/v1/modules"),
        apiRequest<{ installed: InstalledModule[] }>(
          "GET",
          "/api/v1/modules/installed"
        ),
      ]);

      s.stop();

      if (!allRes.ok) {
        ui.error(allRes.error ?? "Failed to load modules.");
        return;
      }

      const all = allRes.data.modules;
      const installedSet = new Set(
        (installedRes.data?.installed ?? [])
          .filter((m) => m.active)
          .map((m) => m.moduleType)
      );

      const combined = all.map((m) => ({
        ...m,
        installed: installedSet.has(m.moduleType),
      }));

      if (opts.format === "json") {
        ui.jsonOutput(combined);
        return;
      }

      ui.heading(`Modules (${combined.length})`);

      ui.table(
        [
          { key: "moduleType", label: "Type", width: 20 },
          { key: "name", label: "Name", width: 24 },
          { key: "category", label: "Category", width: 12 },
          {
            key: "price",
            label: "Price",
            width: 10,
            align: "right" as const,
            format: (v: unknown) => {
              const cents = v as number | null;
              return cents ? `${ui.formatCurrency(cents)}/mo` : "included";
            },
          },
          { key: "minTier", label: "Min Tier", width: 12 },
          {
            key: "installed",
            label: "Status",
            width: 12,
            format: (v: unknown) =>
              v ? ui.SUCCESS("installed") : ui.MUTED("available"),
          },
        ],
        combined
      );

      ui.blank();
      ui.line(
        `  Install: ${ui.BOLD("spoke modules install <MODULE_TYPE>")}`
      );
      ui.blank();
    });

  // ── modules install ───────────────────────────────────────────────

  modules
    .command("install <moduleType>")
    .description("Install a module (e.g. spoke modules install CRM)")
    .action(async (moduleType: string) => {
      const s = ui.spinner(`Installing ${moduleType}...`);
      const res = await apiRequest<{
        success: boolean;
        orgModule: { moduleType: string; active: boolean };
        agentRegistered: boolean;
      }>("POST", "/api/v1/modules/install", {
        moduleType: moduleType.toUpperCase(),
      });
      s.stop();

      if (!res.ok) {
        ui.error(res.error ?? "Install failed.");
        if (res.data && (res.data as any).requiredTier) {
          ui.line(
            `  Upgrade your plan: ${ui.BOLD("spoke upgrade")}`
          );
        }
        return;
      }

      ui.success(
        `Module installed: ${ui.BOLD(res.data.orgModule.moduleType)}`
      );
      if (res.data.agentRegistered) {
        ui.line("  Agent registered with agent-builder.");
      } else {
        ui.line(
          "  Agent registration pending (agent-builder will sync on next request)."
        );
      }
      ui.blank();
    });
}
