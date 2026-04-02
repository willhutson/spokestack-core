import { Command } from "commander";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import inquirer from "inquirer";
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

export function registerSetupCommand(program: Command): void {
  program
    .command("setup")
    .description("Bootstrap local development environment")
    .option("--supabase-url <url>", "Supabase project URL")
    .option("--supabase-key <key>", "Supabase anon/service key")
    .option("--agent-runtime-url <url>", "Agent runtime URL")
    .option("--agent-runtime-secret <secret>", "Agent runtime secret")
    .option("-y, --yes", "Non-interactive mode (all flags required)")
    .action(async (opts) => {
      ui.heading("Setup local environment");

      // ── Check package.json exists ──
      const cwd = process.cwd();
      const pkgPath = path.join(cwd, "package.json");
      if (!fs.existsSync(pkgPath)) {
        ui.error(
          "No package.json found in the current directory. Run this command from your project root.",
        );
        process.exit(1);
      }
      ui.success("package.json found");

      const yes = Boolean(opts.yes);

      // ── Collect values ──
      const supabaseUrl = await flagOrPrompt<string>(
        opts.supabaseUrl,
        yes,
        async () => {
          const { value } = await inquirer.prompt([
            {
              type: "input",
              name: "value",
              message: "Supabase project URL:",
              validate: (v: string) =>
                v.startsWith("http") || "Must be a valid URL",
            },
          ]);
          return value;
        },
        "supabase-url",
      );

      const supabaseKey = await flagOrPrompt<string>(
        opts.supabaseKey,
        yes,
        async () => {
          const { value } = await inquirer.prompt([
            {
              type: "password",
              name: "value",
              message: "Supabase anon key:",
              mask: "*",
              validate: (v: string) =>
                v.length > 0 || "Key is required",
            },
          ]);
          return value;
        },
        "supabase-key",
      );

      const agentRuntimeUrl = await flagOrPrompt<string>(
        opts.agentRuntimeUrl,
        yes,
        async () => {
          const { value } = await inquirer.prompt([
            {
              type: "input",
              name: "value",
              message: "Agent runtime URL:",
              validate: (v: string) =>
                v.startsWith("http") || "Must be a valid URL",
            },
          ]);
          return value;
        },
        "agent-runtime-url",
      );

      const agentRuntimeSecret = await flagOrPrompt<string>(
        opts.agentRuntimeSecret,
        yes,
        async () => {
          const { value } = await inquirer.prompt([
            {
              type: "password",
              name: "value",
              message: "Agent runtime secret:",
              mask: "*",
              validate: (v: string) =>
                v.length > 0 || "Secret is required",
            },
          ]);
          return value;
        },
        "agent-runtime-secret",
      );

      // ── Write .env.local ──
      const envPath = path.join(cwd, ".env.local");
      const envContent = [
        `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseKey}`,
        `SUPABASE_SERVICE_ROLE_KEY=${supabaseKey}`,
        `AGENT_RUNTIME_URL=${agentRuntimeUrl}`,
        `AGENT_RUNTIME_SECRET=${agentRuntimeSecret}`,
        "",
      ].join("\n");

      fs.writeFileSync(envPath, envContent, "utf-8");
      ui.success(".env.local written");

      // ── Run prisma generate ──
      const s1 = ui.spinner("Running prisma generate...");
      try {
        execSync("npx prisma generate", {
          cwd,
          stdio: "pipe",
        });
        s1.stop("Prisma client generated");
      } catch (err) {
        s1.stop();
        const message =
          err instanceof Error ? err.message : "Unknown error";
        ui.warn(`Prisma generate failed: ${message}`);
        ui.line(
          `  ${ui.MUTED("You can run 'npx prisma generate' manually later.")}`,
        );
      }

      // ── Test Supabase connection ──
      const s2 = ui.spinner("Testing Supabase connection...");
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            apikey: supabaseKey,
          },
        });
        if (res.ok || res.status === 200) {
          s2.stop("Supabase connection successful");
        } else {
          s2.stop();
          ui.warn(
            `Supabase responded with status ${res.status}. Check your URL and key.`,
          );
        }
      } catch {
        s2.stop();
        ui.warn(
          "Could not reach Supabase. Check your URL and network connection.",
        );
      }

      // ── Summary ──
      ui.blank();
      ui.divider();
      ui.blank();
      ui.success("Local environment is ready!");
      ui.blank();
      ui.line(`  Next steps:`);
      ui.line(
        `    ${ui.BOLD("spokestack dev")}      ${ui.MUTED("Start the dev server")}`,
      );
      ui.line(
        `    ${ui.BOLD("spokestack seed")}     ${ui.MUTED("Seed your database")}`,
      );
      ui.blank();
    });
}
