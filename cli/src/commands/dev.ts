import { Command } from "commander";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as ui from "../ui.js";

export function registerDevCommand(program: Command): void {
  program
    .command("dev")
    .description("Start the local development server")
    .option("--no-open", "Do not open the browser automatically")
    .option("-p, --port <port>", "Port to run on", "3000")
    .action(async (opts) => {
      const cwd = process.cwd();

      // ── Pre-flight checks ──
      const envPath = path.join(cwd, ".env.local");
      if (!fs.existsSync(envPath)) {
        ui.error(
          "No .env.local found. Run `spokestack setup` to configure your environment first.",
        );
        process.exit(1);
      }

      const nodeModulesPath = path.join(cwd, "node_modules");
      if (!fs.existsSync(nodeModulesPath)) {
        ui.error(
          "No node_modules found. Run `npm install` to install dependencies first.",
        );
        process.exit(1);
      }

      const port = opts.port as string;
      const shouldOpen = opts.open !== false;

      ui.heading("Starting development server");
      ui.line(`  Port: ${ui.BOLD(port)}`);
      ui.blank();

      // ── Spawn next dev ──
      const child = spawn("npx", ["next", "dev", "-p", port], {
        cwd,
        stdio: ["inherit", "pipe", "pipe"],
        env: { ...process.env },
      });

      let browserOpened = false;

      child.stdout?.on("data", async (data: Buffer) => {
        const text = data.toString();
        process.stdout.write(text);

        // Open browser when Next.js is ready
        if (
          shouldOpen &&
          !browserOpened &&
          text.includes("Ready")
        ) {
          browserOpened = true;
          try {
            const open = (await import("open")).default;
            await open(`http://localhost:${port}`);
            ui.success("Opened browser");
          } catch {
            ui.warn(
              `Could not open browser. Visit http://localhost:${port}`,
            );
          }
        }
      });

      child.stderr?.on("data", (data: Buffer) => {
        process.stderr.write(data.toString());
      });

      child.on("error", (err) => {
        ui.error(`Failed to start dev server: ${err.message}`);
        process.exit(1);
      });

      child.on("close", (code) => {
        if (code !== null && code !== 0) {
          ui.error(`Dev server exited with code ${code}`);
          process.exit(code);
        }
      });

      // Forward signals to child process
      const cleanup = () => {
        child.kill("SIGTERM");
      };
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    });
}
