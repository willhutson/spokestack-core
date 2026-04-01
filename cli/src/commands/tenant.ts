import { Command } from "commander";
import inquirer from "inquirer";
import { saveAuth, getConfig, type AuthData } from "../auth.js";
import { apiPublicRequest } from "../api.js";
import * as ui from "../ui.js";

// Supabase config — matches spokestack-core's client.ts
const SUPABASE_URL = "https://dufujpalmzbbwtofpgyv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_i6oqMxrglFTbVpmzFMtUuA_eehALBQR";

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

      // 1. Sign up via Supabase directly (matches web signup pattern)
      let supabaseUser: { id: string };
      let accessToken: string;
      let refreshToken: string;

      try {
        const supabaseRes = await fetch(
          `${SUPABASE_URL}/auth/v1/signup`,
          {
            method: "POST",
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: answers.email,
              password: answers.password,
            }),
          }
        );

        const supabaseData = await supabaseRes.json();

        if (!supabaseRes.ok || supabaseData.error_code) {
          s.stop();
          ui.error(supabaseData.msg || supabaseData.message || "Signup failed.");
          return;
        }

        // Check if email confirmation is required (no session returned)
        if (!supabaseData.access_token && !supabaseData.session?.access_token) {
          s.stop();
          ui.error("Email confirmation may be required. Check your inbox, then run `spokestack login`.");
          return;
        }

        supabaseUser = supabaseData.user || { id: supabaseData.id };
        accessToken = supabaseData.access_token || supabaseData.session?.access_token;
        refreshToken = supabaseData.refresh_token || supabaseData.session?.refresh_token || "";
      } catch (err) {
        s.stop();
        ui.error("Could not reach Supabase. Check your network connection.");
        return;
      }

      // 2. Create SpokeStack user record
      const userRes = await apiPublicRequest("POST", "/api/v1/auth", {
        email: answers.email,
        supabaseId: supabaseUser.id,
        name: answers.email.split("@")[0],
      });

      if (!userRes.ok) {
        s.stop();
        ui.error(userRes.error ?? "Failed to create user record.");
        return;
      }

      // 3. Create organization (seeds core modules based on tier)
      const orgRes = await apiPublicRequest<{
        organization: { id: string; slug: string; name: string };
      }>("PUT", "/api/v1/auth", {
        supabaseId: supabaseUser.id,
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
        accessToken,
        refreshToken,
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
