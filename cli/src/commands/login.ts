import { Command } from "commander";
import inquirer from "inquirer";
import { saveAuth, clearAuth, loadAuth, type AuthData } from "../auth.js";
import { apiPublicRequest } from "../api.js";
import * as ui from "../ui.js";

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Authenticate to an existing SpokeStack workspace")
    .action(async () => {
      ui.blank();

      const existing = loadAuth();
      if (existing) {
        const { proceed } = await inquirer.prompt([
          {
            type: "confirm",
            name: "proceed",
            message: `Already logged in as ${existing.email || existing.orgSlug}. Switch account?`,
            default: false,
          },
        ]);
        if (!proceed) {
          ui.info("Keeping current session.");
          return;
        }
      }

      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "email",
          message: "Email:",
          validate: (input: string) =>
            input.includes("@") ? true : "Enter a valid email.",
        },
        {
          type: "password",
          name: "password",
          message: "Password:",
          mask: "*",
          validate: (input: string) =>
            input.length > 0 ? true : "Password is required.",
        },
      ]);

      const s = ui.spinner("Signing in...");
      const res = await apiPublicRequest<{
        user: {
          id: string;
          email: string;
          name: string;
          memberships: Array<{
            organization: { id: string; slug: string; name: string };
            role: string;
          }>;
        };
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      }>("POST", "/api/v1/auth/login", {
        email: answers.email,
        password: answers.password,
      });
      s.stop();

      if (!res.ok) {
        ui.error(res.error || "Login failed. Check your credentials.");
        process.exit(1);
      }

      const { user, accessToken, refreshToken, expiresAt } = res.data;

      // If user has multiple orgs, let them pick
      let selectedOrg = user.memberships[0]?.organization;
      if (user.memberships.length > 1) {
        const { orgId } = await inquirer.prompt([
          {
            type: "list",
            name: "orgId",
            message: "Select workspace:",
            choices: user.memberships.map((m) => ({
              name: `${m.organization.name} (${m.organization.slug}) — ${m.role}`,
              value: m.organization.id,
            })),
          },
        ]);
        selectedOrg = user.memberships.find(
          (m) => m.organization.id === orgId
        )!.organization;
      }

      if (!selectedOrg) {
        ui.error("No workspace found. Run `spokestack init` to create one.");
        process.exit(1);
      }

      const authData: AuthData = {
        accessToken,
        refreshToken,
        expiresAt,
        orgId: selectedOrg.id,
        orgSlug: selectedOrg.slug,
        email: user.email,
        userName: user.name,
      };

      saveAuth(authData);

      ui.success(`Logged in as ${ui.BOLD(user.name || user.email)}`);
      ui.line(`  Workspace: ${ui.BOLD(selectedOrg.name || selectedOrg.slug)}`);
      ui.blank();
    });
}

export function registerLogoutCommand(program: Command): void {
  program
    .command("logout")
    .description("Clear local auth tokens")
    .action(() => {
      const auth = loadAuth();
      if (!auth) {
        ui.info("Not currently logged in.");
        return;
      }

      clearAuth();
      ui.success("Logged out successfully.");
      ui.blank();
    });
}

export function registerWhoamiCommand(program: Command): void {
  program
    .command("whoami")
    .description("Show current user and workspace")
    .action(() => {
      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in. Run `spokestack login` to authenticate.");
        process.exit(1);
      }

      ui.blank();
      ui.line(`  ${ui.BOLD("User:")}       ${auth.email || ui.MUTED("unknown")}`);
      ui.line(`  ${ui.BOLD("Name:")}       ${auth.userName || ui.MUTED("not set")}`);
      ui.line(`  ${ui.BOLD("Workspace:")}  ${auth.orgSlug}`);
      ui.line(`  ${ui.BOLD("Org ID:")}     ${ui.MUTED(auth.orgId)}`);

      const expiresIn = Math.max(0, Math.round((auth.expiresAt - Date.now()) / 60000));
      const tokenStatus =
        expiresIn > 0
          ? ui.SUCCESS(`valid (${expiresIn}m remaining)`)
          : ui.WARNING("expired — will refresh on next request");
      ui.line(`  ${ui.BOLD("Session:")}    ${tokenStatus}`);
      ui.blank();
    });
}
