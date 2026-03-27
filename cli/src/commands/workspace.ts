import { Command } from "commander";
import { get, post } from "../api.js";
import { loadAuth, saveAuth } from "../auth.js";
import * as ui from "../ui.js";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  tier: string;
  memberCount: number;
}

export function registerWorkspaceCommand(program: Command): void {
  const workspace = program
    .command("workspace")
    .description("Manage workspaces");

  // ── workspace list ────────────────────────────────────────────────

  workspace
    .command("list")
    .description("List your workspaces")
    .option("--format <fmt>", "Output format: table, json", "table")
    .action(async (opts) => {
      const s = ui.spinner("Loading workspaces...");
      const res = await get<{ workspaces: Workspace[] }>("/api/v1/auth/workspaces");
      s.stop();

      if (ui.handleError(res.error)) {
        process.exit(1);
      }

      const workspaces = res.data.workspaces;
      const auth = loadAuth();
      const currentOrgId = auth?.orgId;

      if (opts.format === "json") {
        ui.jsonOutput(workspaces);
        return;
      }

      ui.heading(`Workspaces (${workspaces.length})`);
      ui.table(
        [
          {
            key: "slug",
            label: "Workspace",
            width: 20,
            format: (v) => {
              const slug = v as string;
              const ws = workspaces.find((w) => w.slug === slug);
              const isCurrent = ws?.id === currentOrgId;
              return isCurrent ? `${ui.SUCCESS("\u25CF")} ${slug}` : `  ${slug}`;
            },
          },
          { key: "name", label: "Name", width: 25 },
          { key: "tier", label: "Tier", width: 12 },
          { key: "role", label: "Role", width: 10 },
          { key: "memberCount", label: "Members", width: 8, align: "right" as const },
        ],
        workspaces
      );
      ui.blank();
    });

  // ── workspace switch ──────────────────────────────────────────────

  workspace
    .command("switch <slug>")
    .description("Switch to a different workspace")
    .action(async (slug: string) => {
      const s = ui.spinner(`Switching to ${slug}...`);
      const res = await post<{
        workspace: { id: string; slug: string; name: string };
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
      }>("/api/v1/auth/switch", { slug });
      s.stop();

      if (ui.handleError(res.error)) {
        process.exit(1);
      }

      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in.");
        process.exit(1);
      }

      const ws = res.data.workspace;
      saveAuth({
        ...auth,
        orgId: ws.id,
        orgSlug: ws.slug,
        ...(res.data.accessToken ? { accessToken: res.data.accessToken } : {}),
        ...(res.data.refreshToken ? { refreshToken: res.data.refreshToken } : {}),
        ...(res.data.expiresAt ? { expiresAt: res.data.expiresAt } : {}),
      });

      ui.success(`Switched to ${ui.BOLD(ws.name || ws.slug)}`);
      ui.blank();
    });

  // ── workspace current ─────────────────────────────────────────────

  workspace
    .command("current")
    .description("Show the current workspace")
    .action(() => {
      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in. Run `spokestack login` first.");
        process.exit(1);
      }

      ui.blank();
      ui.line(`  ${ui.BOLD("Current workspace:")} ${auth.orgSlug}`);
      ui.line(`  ${ui.BOLD("Org ID:")} ${ui.MUTED(auth.orgId)}`);
      ui.blank();
    });
}
