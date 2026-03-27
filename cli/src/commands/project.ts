import { Command } from "commander";
import inquirer from "inquirer";
import open from "open";
import { get, post } from "../api.js";
import { getConfig } from "../auth.js";
import * as ui from "../ui.js";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  phases?: Array<{ id: string; name: string; position: number; status: string }>;
  milestones?: Array<{ id: string; title: string; dueDate?: string; completed: boolean }>;
  canvas?: { id: string } | null;
  createdAt: string;
}

export function registerProjectCommand(program: Command): void {
  const project = program
    .command("project")
    .description("Manage projects (Starter plan and above)");

  // ── project new ───────────────────────────────────────────────────

  project
    .command("new [name]")
    .description("Create a new project")
    .option("--description <text>", "Project description")
    .option("--start <date>", "Start date")
    .option("--end <date>", "End date")
    .action(async (nameArg: string | undefined, opts) => {
      let name = nameArg;

      if (!name) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "name",
            message: "Project name:",
            validate: (input: string) =>
              input.trim() ? true : "Name is required.",
          },
          {
            type: "input",
            name: "description",
            message: "Description (optional):",
          },
          {
            type: "input",
            name: "startDate",
            message: "Start date (optional, e.g. 2026-04-01):",
          },
          {
            type: "input",
            name: "endDate",
            message: "End date (optional):",
          },
        ]);
        name = answers.name;
        opts.description = answers.description || opts.description;
        opts.start = answers.startDate || opts.start;
        opts.end = answers.endDate || opts.end;
      }

      const s = ui.spinner("Creating project...");
      const res = await post<{ project: Project }>("/api/v1/projects", {
        name,
        description: opts.description,
        startDate: opts.start || undefined,
        endDate: opts.end || undefined,
      });
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const p = res.data.project;
      ui.success(`Project created: ${ui.BOLD(p.name)}`);
      ui.line(`  ID: ${ui.MUTED(p.id)}`);
      ui.line(`  Status: ${ui.statusBadge(p.status)}`);
      if (p.startDate) ui.line(`  Start: ${ui.formatDate(p.startDate)}`);
      if (p.endDate) ui.line(`  End: ${ui.formatDate(p.endDate)}`);
      ui.blank();
    });

  // ── project list ──────────────────────────────────────────────────

  project
    .command("list")
    .description("List projects")
    .option("--status <status>", "Filter by status (PLANNING, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED)")
    .option("--format <fmt>", "Output format: table, json, minimal", "table")
    .action(async (opts) => {
      const s = ui.spinner("Loading projects...");
      const params = new URLSearchParams();
      if (opts.status) params.set("status", opts.status.toUpperCase());

      const queryStr = params.toString();
      const path = `/api/v1/projects${queryStr ? `?${queryStr}` : ""}`;
      const res = await get<{ projects: Project[] }>(path);
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const projects = res.data.projects;

      if (opts.format === "json") {
        ui.jsonOutput(projects);
        return;
      }

      if (opts.format === "minimal") {
        ui.minimalOutput(
          projects.map((p) => [
            p.id,
            p.name,
            p.status,
            p.startDate ? ui.formatDate(p.startDate) : "-",
            p.endDate ? ui.formatDate(p.endDate) : "-",
          ])
        );
        return;
      }

      ui.heading(`Projects (${projects.length})`);
      ui.table(
        [
          { key: "id", label: "ID", width: 10 },
          { key: "name", label: "Name", width: 25 },
          { key: "status", label: "Status", width: 12, format: (v) => ui.statusBadge(v as string) },
          {
            key: "phases",
            label: "Phases",
            width: 8,
            format: (v) => {
              const phases = v as Project["phases"];
              return phases ? String(phases.length) : "0";
            },
          },
          {
            key: "milestones",
            label: "Milestones",
            width: 10,
            format: (v) => {
              const ms = v as Project["milestones"];
              if (!ms || ms.length === 0) return ui.MUTED("0");
              const done = ms.filter((m) => m.completed).length;
              return `${done}/${ms.length}`;
            },
          },
          { key: "startDate", label: "Start", width: 8, format: (v) => ui.formatDate(v as string) },
          { key: "endDate", label: "End", width: 8, format: (v) => ui.formatDate(v as string) },
        ],
        projects
      );
      ui.blank();
    });

  // ── project show ──────────────────────────────────────────────────

  project
    .command("show <projectId>")
    .description("Show project details")
    .option("--format <fmt>", "Output format: table, json", "table")
    .action(async (projectId: string, opts) => {
      const s = ui.spinner("Loading project...");
      const res = await get<{ project: Project }>(`/api/v1/projects/${projectId}`);
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const p = res.data.project;

      if (opts.format === "json") {
        ui.jsonOutput(p);
        return;
      }

      ui.heading(p.name);
      ui.line(`  ${ui.BOLD("ID:")}          ${p.id}`);
      ui.line(`  ${ui.BOLD("Status:")}      ${ui.statusBadge(p.status)}`);
      ui.line(`  ${ui.BOLD("Start:")}       ${ui.formatDate(p.startDate)}`);
      ui.line(`  ${ui.BOLD("End:")}         ${ui.formatDate(p.endDate)}`);
      ui.line(`  ${ui.BOLD("Created:")}     ${ui.formatDateTime(p.createdAt)}`);

      if (p.description) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Description:")}`);
        ui.line(`  ${p.description}`);
      }

      if (p.phases && p.phases.length > 0) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Phases:")}`);
        for (const phase of p.phases) {
          ui.line(`    ${ui.MUTED(`${phase.position}.`)} ${phase.name} ${ui.statusBadge(phase.status)}`);
        }
      }

      if (p.milestones && p.milestones.length > 0) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Milestones:")}`);
        ui.taskList(
          p.milestones.map((m) => ({
            label: m.title,
            done: m.completed,
            detail: m.dueDate ? `due ${ui.formatDate(m.dueDate)}` : undefined,
          }))
        );
      }

      if (p.canvas) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Canvas:")} ${ui.MUTED(p.canvas.id)}`);
        ui.line(`  Open in browser: ${ui.BOLD(`spokestack project canvas ${p.id}`)}`);
      }

      ui.blank();
    });

  // ── project canvas ────────────────────────────────────────────────

  project
    .command("canvas <projectId>")
    .description("Open project workflow canvas in browser")
    .action(async (projectId: string) => {
      const { apiBase } = getConfig();
      const url = `${apiBase}/projects/${projectId}/canvas`;
      ui.info(`Opening canvas: ${ui.MUTED(url)}`);

      try {
        await open(url);
        ui.success("Opened in browser.");
      } catch {
        ui.warn("Could not open browser. Copy the URL above.");
      }

      ui.blank();
    });
}
