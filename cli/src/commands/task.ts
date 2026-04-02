import { Command } from "commander";
import inquirer from "inquirer";
import { get, post, patch } from "../api.js";
import * as ui from "../ui.js";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  assignee?: { name: string } | null;
  dueDate?: string;
  taskList?: { name: string } | null;
  comments?: Array<{ body: string; createdAt: string }>;
  attachments?: Array<{ fileName: string }>;
  createdAt: string;
  completedAt?: string;
}

export function registerTaskCommand(program: Command): void {
  const task = program
    .command("task")
    .description("Manage tasks (free tier)");

  // ── task add ──────────────────────────────────────────────────────

  task
    .command("add [title]")
    .description("Create a new task")
    .option("--assign <name>", "Assign to a team member")
    .option("--due <date>", "Due date (e.g. friday, 2026-04-01)")
    .option("--priority <level>", "Priority: LOW, MEDIUM, HIGH, URGENT", "MEDIUM")
    .option("--status <status>", "Status: TODO, IN_PROGRESS, DONE", "TODO")
    .option("--list <listId>", "Task list ID")
    .option("--description <text>", "Task description")
    .option("--yes", "Skip interactive prompts")
    .action(async (titleArg: string | undefined, opts) => {
      let title = titleArg;

      if (!title) {
        if (opts.yes) {
          ui.error("--title (positional argument) is required with --yes");
          process.exit(1);
        }
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "title",
            message: "Task title:",
            validate: (input: string) =>
              input.trim() ? true : "Title is required.",
          },
          {
            type: "input",
            name: "description",
            message: "Description (optional):",
          },
          {
            type: "list",
            name: "priority",
            message: "Priority:",
            choices: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            default: "MEDIUM",
          },
          {
            type: "input",
            name: "dueDate",
            message: "Due date (optional, e.g. 2026-04-01):",
          },
        ]);
        title = answers.title;
        opts.description = answers.description || opts.description;
        opts.priority = answers.priority || opts.priority;
        opts.due = answers.dueDate || opts.due;
      }

      const s = ui.spinner("Creating task...");
      const res = await post<{ task: Task }>("/api/v1/tasks", {
        title,
        description: opts.description,
        priority: opts.priority?.toUpperCase(),
        status: opts.status?.toUpperCase(),
        dueDate: opts.due ? parseDateArg(opts.due) : undefined,
        taskListId: opts.list,
        assigneeName: opts.assign,
      });
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const t = res.data.task;
      ui.success(`Task created: ${ui.BOLD(t.title)}`);
      ui.line(`  ID: ${ui.MUTED(t.id)}`);
      ui.line(`  Priority: ${ui.priorityBadge(t.priority)}`);
      if (t.dueDate) ui.line(`  Due: ${ui.formatDate(t.dueDate)}`);
      ui.blank();
    });

  // ── task list ─────────────────────────────────────────────────────

  task
    .command("list")
    .description("List tasks")
    .option("--mine", "Show only my assigned tasks")
    .option("--status <status>", "Filter by status (TODO, IN_PROGRESS, DONE, ARCHIVED)")
    .option("--format <fmt>", "Output format: table, json, minimal", "table")
    .action(async (opts) => {
      const s = ui.spinner("Loading tasks...");
      const params = new URLSearchParams();
      if (opts.status) params.set("status", opts.status.toUpperCase());
      if (opts.mine) params.set("mine", "true");

      const queryStr = params.toString();
      const path = `/api/v1/tasks${queryStr ? `?${queryStr}` : ""}`;
      const res = await get<{ tasks: Task[] }>(path);
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const tasks = res.data.tasks;

      if (opts.format === "json") {
        ui.jsonOutput(tasks);
        return;
      }

      if (opts.format === "minimal") {
        ui.minimalOutput(
          tasks.map((t) => [
            t.id,
            t.title,
            t.status,
            t.assignee?.name || "-",
            t.dueDate ? ui.formatDate(t.dueDate) : "-",
          ])
        );
        return;
      }

      ui.heading(`Tasks (${tasks.length})`);
      ui.table(
        [
          { key: "id", label: "ID", width: 10 },
          { key: "title", label: "Title", width: 30 },
          { key: "status", label: "Status", width: 12, format: (v) => ui.statusBadge(v as string) },
          { key: "priority", label: "Priority", width: 8, format: (v) => ui.priorityBadge(v as string) },
          { key: "assignee", label: "Assignee", width: 12, format: (v) => {
            const a = v as { name: string } | null;
            return a?.name || ui.MUTED("-");
          }},
          { key: "dueDate", label: "Due", width: 8, format: (v) => ui.formatDate(v as string) },
        ],
        tasks
      );
      ui.blank();
    });

  // ── task done ─────────────────────────────────────────────────────

  task
    .command("done <taskId>")
    .description("Mark a task as complete")
    .action(async (taskId: string) => {
      const s = ui.spinner("Completing task...");
      const res = await patch<{ task: Task }>(`/api/v1/tasks/${taskId}`, {
        status: "DONE",
      });
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const t = res.data.task;
      ui.success(`Task completed: ${ui.BOLD(t.title)}`);
      ui.blank();
    });

  // ── task show ─────────────────────────────────────────────────────

  task
    .command("show <taskId>")
    .description("Show task details")
    .option("--format <fmt>", "Output format: table, json", "table")
    .action(async (taskId: string, opts) => {
      const s = ui.spinner("Loading task...");
      const res = await get<{ task: Task }>(`/api/v1/tasks/${taskId}`);
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const t = res.data.task;

      if (opts.format === "json") {
        ui.jsonOutput(t);
        return;
      }

      ui.heading(t.title);
      ui.line(`  ${ui.BOLD("ID:")}          ${t.id}`);
      ui.line(`  ${ui.BOLD("Status:")}      ${ui.statusBadge(t.status)}`);
      ui.line(`  ${ui.BOLD("Priority:")}    ${ui.priorityBadge(t.priority)}`);
      ui.line(`  ${ui.BOLD("Assignee:")}    ${t.assignee?.name || ui.MUTED("unassigned")}`);
      ui.line(`  ${ui.BOLD("Due:")}         ${ui.formatDate(t.dueDate)}`);
      ui.line(`  ${ui.BOLD("List:")}        ${t.taskList?.name || ui.MUTED("none")}`);
      ui.line(`  ${ui.BOLD("Created:")}     ${ui.formatDateTime(t.createdAt)}`);
      if (t.completedAt) {
        ui.line(`  ${ui.BOLD("Completed:")}  ${ui.formatDateTime(t.completedAt)}`);
      }

      if (t.description) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Description:")}`);
        ui.line(`  ${t.description}`);
      }

      if (t.comments && t.comments.length > 0) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Recent Comments:")}`);
        for (const c of t.comments) {
          ui.line(`  ${ui.MUTED(ui.formatDateTime(c.createdAt))} ${c.body}`);
        }
      }

      ui.blank();
    });
}

// ── Helpers ─────────────────────────────────────────────────────────

function parseDateArg(input: string): string {
  // Handle relative day names
  const lower = input.toLowerCase().trim();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayIndex = dayNames.indexOf(lower);

  if (dayIndex >= 0) {
    const now = new Date();
    const currentDay = now.getDay();
    let daysAhead = dayIndex - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    now.setDate(now.getDate() + daysAhead);
    return now.toISOString().split("T")[0];
  }

  if (lower === "today") return new Date().toISOString().split("T")[0];
  if (lower === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  // Assume ISO-ish date
  return input;
}
