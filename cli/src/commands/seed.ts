import { Command } from "commander";
import inquirer from "inquirer";
import { loadAuth } from "../auth.js";
import { apiRequest } from "../api.js";
import * as ui from "../ui.js";

// ── Helpers ────────────────────────────────────────────────────────

async function flagOrPrompt<T>(
  flagValue: T | undefined,
  yes: boolean,
  promptFn: () => Promise<T>,
  flagName: string,
): Promise<T> {
  if (flagValue !== undefined) return flagValue;
  if (yes) {
    console.error(`Error: --${flagName} required in non-interactive mode`);
    process.exit(1);
  }
  return promptFn();
}

// ── Command ────────────────────────────────────────────────────────

const VALID_TIERS = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"];

export function registerSeedCommand(program: Command): void {
  program
    .command("seed")
    .description("Seed your database with initial data via the API")
    .option("--tier <tier>", "Subscription tier", "ENTERPRISE")
    .option("--template <template>", "Industry template to apply")
    .option(
      "--modules <modules>",
      "Comma-separated list of module types to enable",
    )
    .option(
      "--onboarding-complete",
      "Mark onboarding as complete",
      false,
    )
    .option("-y, --yes", "Non-interactive mode")
    .action(async (opts) => {
      ui.heading("Database seeding");

      // ── Require auth ──
      const auth = loadAuth();
      if (!auth) {
        ui.error(
          "Not logged in. Run `spokestack login` or `spokestack init` first.",
        );
        process.exit(1);
      }
      ui.success("Authenticated");

      const yes = Boolean(opts.yes);

      // ── Collect options ──
      const tier = await flagOrPrompt<string>(
        opts.tier !== "ENTERPRISE" ? opts.tier : undefined,
        yes,
        async () => {
          const { value } = await inquirer.prompt([
            {
              type: "list",
              name: "value",
              message: "Subscription tier:",
              choices: VALID_TIERS,
              default: "ENTERPRISE",
            },
          ]);
          return value;
        },
        "tier",
      );
      const finalTier = tier || "ENTERPRISE";

      if (!VALID_TIERS.includes(finalTier)) {
        ui.error(
          `Invalid tier "${finalTier}". Valid: ${VALID_TIERS.join(", ")}`,
        );
        process.exit(1);
      }

      const template = opts.template as string | undefined;
      const modules = opts.modules
        ? (opts.modules as string).split(",").map((m: string) => m.trim())
        : undefined;
      const onboardingComplete = Boolean(opts.onboardingComplete);

      // ── Confirm ──
      if (!yes) {
        ui.blank();
        ui.line(`  Tier:        ${ui.BOLD(finalTier)}`);
        if (template) ui.line(`  Template:    ${ui.BOLD(template)}`);
        if (modules)
          ui.line(`  Modules:     ${ui.BOLD(modules.join(", "))}`);
        ui.line(
          `  Onboarding:  ${ui.BOLD(onboardingComplete ? "complete" : "pending")}`,
        );
        ui.blank();

        const { confirm } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirm",
            message: "Proceed with seeding?",
            default: true,
          },
        ]);

        if (!confirm) {
          ui.line(ui.MUTED("  Aborted."));
          return;
        }
      }

      // ── Call seed API ──
      const s1 = ui.spinner("Seeding database...");

      const body: Record<string, unknown> = {
        tier: finalTier,
        onboardingComplete,
      };
      if (template) body.template = template;
      if (modules) body.modules = modules;

      const res = await apiRequest<{
        seeded: boolean;
        details?: {
          usersCreated?: number;
          modulesInstalled?: string[];
          tasksCreated?: number;
          projectsCreated?: number;
        };
        message?: string;
      }>("POST", "/api/v1/admin/seed", body);

      s1.stop();

      if (!res.ok) {
        ui.error(res.error || "Seeding failed.");
        process.exit(1);
      }

      ui.success("Database seeded successfully");

      // ── Show results ──
      if (res.data.details) {
        const d = res.data.details;
        ui.blank();
        if (d.usersCreated !== undefined)
          ui.line(`  Users created:     ${d.usersCreated}`);
        if (d.modulesInstalled && d.modulesInstalled.length > 0)
          ui.line(
            `  Modules installed: ${d.modulesInstalled.join(", ")}`,
          );
        if (d.tasksCreated !== undefined)
          ui.line(`  Tasks created:     ${d.tasksCreated}`);
        if (d.projectsCreated !== undefined)
          ui.line(`  Projects created:  ${d.projectsCreated}`);
      }

      if (res.data.message) {
        ui.blank();
        ui.line(`  ${ui.MUTED(res.data.message)}`);
      }

      ui.blank();
    });
}
