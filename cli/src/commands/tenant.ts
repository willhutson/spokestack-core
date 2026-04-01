import { Command } from "commander";
import inquirer from "inquirer";
import { saveAuth, type AuthData } from "../auth.js";
import { apiPublicRequest } from "../api.js";
import * as ui from "../ui.js";

export function registerTenantCommand(program: Command): void {
  const tenant = program
    .command("tenant")
    .description("Manage SpokeStack tenants (organizations)");

  tenant
    .command("create")
    .description("Create a new tenant workspace")
    .action(async () => {
      ui.blank();
      ui.heading("Create a New Tenant");

      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "orgName",
          message: "Organization name:",
          validate: (input: string) =>
            input.trim().length >= 2
              ? true
              : "Name must be at least 2 characters.",
        },
        {
          type: "input",
          name: "email",
          message: "Admin email:",
          validate: (input: string) =>
            input.includes("@") ? true : "Enter a valid email.",
        },
        {
          type: "password",
          name: "password",
          message: "Password:",
          mask: "*",
          validate: (input: string) =>
            input.length >= 6
              ? true
              : "Password must be at least 6 characters.",
        },
        {
          type: "list",
          name: "tier",
          message: "Billing tier:",
          choices: [
            { name: "Free ($0/mo — Tasks Agent)", value: "FREE" },
            { name: "Starter ($29/mo — + Projects Agent)", value: "STARTER" },
            { name: "Pro ($59/mo — + Briefs Agent)", value: "PRO" },
            {
              name: "Business ($149/mo — + Orders Agent)",
              value: "BUSINESS",
            },
          ],
          default: "FREE",
        },
      ]);

      const s = ui.spinner("Creating tenant...");

      // 1. Sign up
      const signupRes = await apiPublicRequest<{
        user: { id: string; supabaseId: string };
        session: { access_token: string; refresh_token: string };
      }>("POST", "/auth/signup", {
        email: answers.email,
        password: answers.password,
      });

      if (!signupRes.ok) {
        s.stop();
        ui.error(signupRes.error ?? "Signup failed.");
        return;
      }

      // 2. Create user record
      const token = signupRes.data.session?.access_token;
      if (!token) {
        s.stop();
        ui.error("No session returned. Check your email to confirm, then run `spoke login`.");
        return;
      }

      await apiPublicRequest("POST", "/api/v1/auth", {
        email: answers.email,
        supabaseId: signupRes.data.user.supabaseId ?? signupRes.data.user.id,
        name: answers.email.split("@")[0],
      });

      // 3. Create organization
      const orgRes = await apiPublicRequest<{
        organization: { id: string; slug: string; name: string };
      }>("PUT", "/api/v1/auth", {
        supabaseId: signupRes.data.user.supabaseId ?? signupRes.data.user.id,
        orgName: answers.orgName,
      });

      s.stop();

      if (!orgRes.ok) {
        ui.error(orgRes.error ?? "Failed to create organization.");
        return;
      }

      const org = orgRes.data.organization;

      // Save auth
      const authData: AuthData = {
        accessToken: token,
        refreshToken: signupRes.data.session.refresh_token ?? "",
        expiresAt: Date.now() + 3600 * 1000,
        orgId: org.id,
        orgSlug: org.slug,
        email: answers.email,
      };
      saveAuth(authData);

      ui.success(`Tenant created: ${ui.BOLD(org.name)}`);
      ui.line(`  Slug: ${org.slug}`);
      ui.line(`  Tier: ${answers.tier}`);
      ui.line(`  Admin: ${answers.email}`);
      ui.blank();
      ui.line(
        `  Core modules (TASKS${answers.tier !== "FREE" ? ", PROJECTS" : ""}${answers.tier === "PRO" || answers.tier === "BUSINESS" ? ", BRIEFS" : ""}${answers.tier === "BUSINESS" ? ", ORDERS" : ""}) have been seeded.`
      );
      ui.blank();
      ui.line(`  Next: ${ui.BOLD("spoke instance configure")} to set up your domain and channels.`);
      ui.blank();
    });
}
