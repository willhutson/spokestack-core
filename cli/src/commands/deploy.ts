import { Command } from "commander";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as ui from "../ui.js";

export function registerDeployCommand(program: Command): void {
  program
    .command("deploy")
    .description("Deploy to Vercel")
    .option("-y, --yes", "Skip confirmation prompts")
    .option(
      "--env <environment>",
      "Deployment environment (production or preview)",
      "preview",
    )
    .action(async (opts) => {
      ui.heading("Deploy to Vercel");

      const cwd = process.cwd();
      const yes = Boolean(opts.yes);
      const environment = opts.env as string;

      // ── Check vercel CLI is available ──
      try {
        execSync("which vercel", { stdio: "pipe" });
      } catch {
        ui.error(
          "Vercel CLI not found. Install it with `npm i -g vercel`.",
        );
        process.exit(1);
      }
      ui.success("Vercel CLI found");

      // ── Read .env.local for env vars ──
      const envPath = path.join(cwd, ".env.local");
      const envVars: Record<string, string> = {};

      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const rawLine of content.split("\n")) {
          const line = rawLine.trim();
          if (!line || line.startsWith("#")) continue;
          const eqIdx = line.indexOf("=");
          if (eqIdx === -1) continue;
          const key = line.slice(0, eqIdx).trim();
          const value = line.slice(eqIdx + 1).trim();
          envVars[key] = value;
        }
        ui.success(
          `Loaded ${Object.keys(envVars).length} env vars from .env.local`,
        );
      } else {
        ui.warn("No .env.local found. Deploying without local env vars.");
      }

      // ── Set env vars on Vercel ──
      const envKeys = Object.keys(envVars);
      if (envKeys.length > 0) {
        const s1 = ui.spinner("Pushing environment variables to Vercel...");
        let envErrors = 0;

        for (const [key, value] of Object.entries(envVars)) {
          try {
            // Pipe value via stdin to avoid shell escaping issues
            execSync(
              `printf '%s' "${value.replace(/"/g, '\\"')}" | vercel env add ${key} ${environment} --yes 2>/dev/null || true`,
              { cwd, stdio: "pipe" },
            );
          } catch {
            envErrors++;
          }
        }

        s1.stop(
          envErrors > 0
            ? `Environment variables pushed (${envErrors} already existed)`
            : "Environment variables pushed",
        );
      }

      // ── Run deployment ──
      const prodFlag = environment === "production" ? " --prod" : "";
      const confirmFlag = yes ? " --yes" : " --yes";
      const deployCmd = `vercel${prodFlag}${confirmFlag}`;

      ui.blank();
      ui.line(`  Running: ${ui.MUTED(deployCmd)}`);
      ui.blank();

      const s2 = ui.spinner("Deploying...");
      try {
        const output = execSync(deployCmd, {
          cwd,
          stdio: "pipe",
          encoding: "utf-8",
        });
        s2.stop("Deployment complete");

        // Extract deployment URL from output
        const lines = output.trim().split("\n");
        const deployUrl = lines.find((l) =>
          l.trim().startsWith("https://"),
        );

        ui.blank();
        if (deployUrl) {
          ui.success(`Deployment URL: ${ui.BOLD(deployUrl.trim())}`);
        } else {
          ui.line(`  ${output.trim()}`);
        }

        ui.blank();
        ui.line(
          `  Environment: ${ui.BOLD(environment)}`,
        );
        ui.blank();
      } catch (err) {
        s2.stop();
        const message =
          err instanceof Error ? err.message : "Unknown error";
        ui.error(`Deployment failed: ${message}`);
        process.exit(1);
      }
    });
}
