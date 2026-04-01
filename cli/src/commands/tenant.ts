import { Command } from "commander";
import inquirer from "inquirer";
import { saveAuth, type AuthData } from "../auth.js";
import { apiPublicRequest, apiRequest } from "../api.js";
import * as ui from "../ui.js";

const VALID_TEMPLATES = [
  "agency", "saas", "services", "ecommerce",
  "construction", "consulting", "media", "education",
];

export function registerTenantCommand(program: Command): void {
  const tenant = program
    .command("tenant")
    .description("Manage SpokeStack tenants (organizations)");

  tenant
    .command("create")
    .description("Create a new tenant workspace")
    .option(
      "--template <industry>",
      `Industry template: ${VALID_TEMPLATES.join(", ")}`
    )
    .action(async (opts) => {
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

      // Install template modules if --template provided
      const template = opts.template as string | undefined;
      if (template) {
        if (!VALID_TEMPLATES.includes(template.toLowerCase())) {
          ui.warn(`Unknown template "${template}". Valid: ${VALID_TEMPLATES.join(", ")}`);
        } else {
          ui.blank();
          const s3 = ui.spinner(`Installing ${template} template modules...`);
          const recRes = await apiRequest<{
            label: string;
            recommended: Array<{ moduleType: string; name: string; canInstall: boolean }>;
          }>("GET", `/api/v1/modules/recommend?industry=${template.toLowerCase()}`);
          s3.stop();

          if (recRes.ok && recRes.data.recommended) {
            const toInstall = recRes.data.recommended.filter((m) => m.canInstall).map((m) => m.moduleType);
            if (toInstall.length > 0) {
              const names = recRes.data.recommended.filter((m) => m.canInstall).map((m) => m.name);
              ui.info(`Installing ${toInstall.length} modules: ${names.join(", ")}...`);

              const s4 = ui.spinner("Installing modules...");
              const batchRes = await apiRequest<{
                installed: Array<{ moduleType: string; success: boolean }>;
                skipped: Array<{ moduleType: string; requiredTier?: string }>;
              }>("POST", "/api/v1/modules/install-batch", { moduleTypes: toInstall });
              s4.stop();

              if (batchRes.ok) {
                for (const m of batchRes.data.installed) ui.success(`${m.moduleType} installed`);
                for (const m of batchRes.data.skipped) ui.warn(`${m.moduleType} skipped (requires ${m.requiredTier})`);
              }
            }
          }
        }
      }

      ui.blank();
      ui.line(`  Next: ${ui.BOLD("spoke instance configure")} to set up your domain and channels.`);
      if (!template) {
        ui.line(`  ${ui.MUTED("Tip:")} Use ${ui.BOLD("--template agency")} to install industry modules.`);
      }
      ui.blank();
    });
}
