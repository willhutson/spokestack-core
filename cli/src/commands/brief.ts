import { Command } from "commander";
import inquirer from "inquirer";
import { get, post, patch } from "../api.js";
import * as ui from "../ui.js";

interface Brief {
  id: string;
  title: string;
  description?: string;
  status: string;
  clientName?: string;
  createdAt: string;
  phases?: Array<{ id: string; name: string; position: number; status: string }>;
  artifacts?: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
}

export function registerBriefCommand(program: Command): void {
  const brief = program
    .command("brief")
    .description("Manage briefs (Pro plan and above)");

  // ── brief create ──────────────────────────────────────────────────

  brief
    .command("create [title]")
    .description("Create a new brief")
    .option("--description <text>", "Brief description")
    .option("--client <name>", "Client name")
    .action(async (titleArg: string | undefined, opts) => {
      let title = titleArg;

      if (!title) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "title",
            message: "Brief title:",
            validate: (input: string) =>
              input.trim() ? true : "Title is required.",
          },
          {
            type: "input",
            name: "description",
            message: "Description (optional):",
          },
          {
            type: "input",
            name: "clientName",
            message: "Client name (optional):",
          },
        ]);
        title = answers.title;
        opts.description = answers.description || opts.description;
        opts.client = answers.clientName || opts.client;
      }

      const s = ui.spinner("Creating brief...");
      const res = await post<{ brief: Brief }>("/api/v1/briefs", {
        title,
        description: opts.description,
        clientName: opts.client,
      });
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const b = res.data.brief;
      ui.success(`Brief created: ${ui.BOLD(b.title)}`);
      ui.line(`  ID: ${ui.MUTED(b.id)}`);
      ui.line(`  Status: ${ui.statusBadge(b.status)}`);
      if (b.clientName) ui.line(`  Client: ${b.clientName}`);
      ui.blank();
    });

  // ── brief list ────────────────────────────────────────────────────

  brief
    .command("list")
    .description("List briefs")
    .option("--format <fmt>", "Output format: table, json, minimal", "table")
    .action(async (opts) => {
      const s = ui.spinner("Loading briefs...");
      const res = await get<{ briefs: Brief[] }>("/api/v1/briefs");
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const briefs = res.data.briefs;

      if (opts.format === "json") {
        ui.jsonOutput(briefs);
        return;
      }

      if (opts.format === "minimal") {
        ui.minimalOutput(
          briefs.map((b) => [
            b.id,
            b.title,
            b.status,
            b.clientName || "-",
            String(b.artifacts?.length || 0),
          ])
        );
        return;
      }

      ui.heading(`Briefs (${briefs.length})`);
      ui.table(
        [
          { key: "id", label: "ID", width: 10 },
          { key: "title", label: "Title", width: 25 },
          { key: "status", label: "Status", width: 12, format: (v) => ui.statusBadge(v as string) },
          { key: "clientName", label: "Client", width: 15 },
          {
            key: "artifacts",
            label: "Artifacts",
            width: 10,
            format: (v) => {
              const arts = v as Brief["artifacts"];
              return arts ? String(arts.length) : "0";
            },
          },
          { key: "createdAt", label: "Created", width: 10, format: (v) => ui.formatDate(v as string) },
        ],
        briefs
      );
      ui.blank();
    });

  // ── brief show ────────────────────────────────────────────────────

  brief
    .command("show <briefId>")
    .description("Show brief details and artifact status")
    .option("--format <fmt>", "Output format: table, json", "table")
    .action(async (briefId: string, opts) => {
      const s = ui.spinner("Loading brief...");
      const res = await get<{ brief: Brief }>(`/api/v1/briefs/${briefId}`);
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const b = res.data.brief;

      if (opts.format === "json") {
        ui.jsonOutput(b);
        return;
      }

      ui.heading(b.title);
      ui.line(`  ${ui.BOLD("ID:")}        ${b.id}`);
      ui.line(`  ${ui.BOLD("Status:")}    ${ui.statusBadge(b.status)}`);
      ui.line(`  ${ui.BOLD("Client:")}    ${b.clientName || ui.MUTED("none")}`);
      ui.line(`  ${ui.BOLD("Created:")}   ${ui.formatDateTime(b.createdAt)}`);

      if (b.description) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Description:")}`);
        ui.line(`  ${b.description}`);
      }

      if (b.phases && b.phases.length > 0) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Phases:")}`);
        for (const phase of b.phases) {
          ui.line(`    ${ui.MUTED(`${phase.position}.`)} ${phase.name} ${ui.statusBadge(phase.status)}`);
        }
      }

      if (b.artifacts && b.artifacts.length > 0) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Artifacts:")}`);
        ui.table(
          [
            { key: "id", label: "ID", width: 10 },
            { key: "title", label: "Title", width: 25 },
            { key: "type", label: "Type", width: 12 },
            { key: "status", label: "Status", width: 12, format: (v) => ui.statusBadge(v as string) },
          ],
          b.artifacts
        );
      }

      ui.blank();
    });

  // ── brief review ──────────────────────────────────────────────────

  brief
    .command("review <artifactId>")
    .description("Review an artifact")
    .action(async (artifactId: string) => {
      // Fetch the artifact details first
      const s = ui.spinner("Loading artifact...");
      const res = await get<{
        artifact: {
          id: string;
          title: string;
          type: string;
          status: string;
          content?: string;
          url?: string;
        };
      }>(`/api/v1/briefs/artifacts/${artifactId}`);
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const artifact = res.data.artifact;

      ui.heading(`Review: ${artifact.title}`);
      ui.line(`  ${ui.BOLD("Type:")}     ${artifact.type}`);
      ui.line(`  ${ui.BOLD("Status:")}   ${ui.statusBadge(artifact.status)}`);

      if (artifact.content) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Content:")}`);
        ui.line(`  ${artifact.content.substring(0, 500)}`);
        if (artifact.content.length > 500) {
          ui.line(`  ${ui.MUTED(`... (${artifact.content.length} chars total)`)}`);
        }
      }

      if (artifact.url) {
        ui.blank();
        ui.line(`  ${ui.BOLD("URL:")} ${artifact.url}`);
      }

      ui.blank();

      const { decision } = await inquirer.prompt([
        {
          type: "list",
          name: "decision",
          message: "Your review decision:",
          choices: [
            { name: "Approve", value: "APPROVED" },
            { name: "Request revisions", value: "REVISIONS_REQUESTED" },
            { name: "Reject", value: "REJECTED" },
            { name: "Skip (decide later)", value: "SKIP" },
          ],
        },
      ]);

      if (decision === "SKIP") {
        ui.info("Skipped. Review later with `spokestack brief review`.");
        ui.blank();
        return;
      }

      let feedback: string | undefined;
      if (decision === "REVISIONS_REQUESTED" || decision === "REJECTED") {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "feedback",
            message: "Feedback / revision notes:",
          },
        ]);
        feedback = answers.feedback;
      }

      const s2 = ui.spinner("Submitting review...");
      const reviewRes = await patch(`/api/v1/briefs/artifacts/${artifactId}/review`, {
        decision,
        feedback,
      });
      s2.stop();

      if (ui.handleError(reviewRes.error)) {
        process.exit(1);
      }

      ui.success(`Review submitted: ${ui.statusBadge(decision)}`);
      ui.blank();
    });
}
