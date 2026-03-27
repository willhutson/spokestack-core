import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import { get } from "../api.js";
import { loadAuth } from "../auth.js";
import * as ui from "../ui.js";

interface ExportData {
  exportedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  tasks: unknown[];
  projects: unknown[];
  briefs: unknown[];
  orders: unknown[];
  customers: unknown[];
  contextEntries: unknown[];
  members: unknown[];
}

export function registerExportCommand(program: Command): void {
  program
    .command("export")
    .description("Export all workspace data as a JSON archive")
    .option("--output <path>", "Output file path")
    .option("--pretty", "Pretty-print JSON output", false)
    .action(async (opts) => {
      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in. Run `spokestack login` first.");
        process.exit(1);
      }

      ui.heading("Data Export");
      ui.line("Exporting all workspace data...");
      ui.blank();

      const s = ui.spinner("Downloading workspace data...");
      const res = await get<ExportData>("/api/v1/export");
      s.stop();

      if (ui.handleError(res.error)) {
        process.exit(1);
      }

      const data = res.data;
      const json = opts.pretty
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      // Determine output path
      const defaultName = `spokestack-export-${auth.orgSlug}-${new Date().toISOString().split("T")[0]}.json`;
      const outputPath = opts.output
        ? path.resolve(opts.output)
        : path.join(process.cwd(), defaultName);

      try {
        fs.writeFileSync(outputPath, json, "utf-8");

        const sizeKB = Math.round(Buffer.byteLength(json) / 1024);

        ui.success(`Export saved to ${ui.BOLD(outputPath)}`);
        ui.blank();
        ui.line(`  ${ui.BOLD("Size:")}          ${sizeKB} KB`);
        ui.line(`  ${ui.BOLD("Organization:")}  ${data.organization.name}`);
        ui.line(`  ${ui.BOLD("Exported at:")}   ${data.exportedAt}`);
        ui.blank();
        ui.line(`  ${ui.BOLD("Contents:")}`);
        ui.line(`    Tasks:            ${data.tasks?.length || 0}`);
        ui.line(`    Projects:         ${data.projects?.length || 0}`);
        ui.line(`    Briefs:           ${data.briefs?.length || 0}`);
        ui.line(`    Orders:           ${data.orders?.length || 0}`);
        ui.line(`    Customers:        ${data.customers?.length || 0}`);
        ui.line(`    Context entries:  ${data.contextEntries?.length || 0}`);
        ui.line(`    Members:          ${data.members?.length || 0}`);
        ui.blank();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        ui.error(`Failed to write file: ${msg}`);
        process.exit(1);
      }
    });
}
