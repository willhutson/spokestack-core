import { Command } from "commander";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import inquirer from "inquirer";
import open from "open";
import { saveAuth, getConfig, type AuthData } from "../auth.js";
import { apiPublicRequest, apiRequestWithAuth } from "../api.js";
import * as ui from "../ui.js";

// ── Constants ──────────────────────────────────────────────────────

const VALID_TEMPLATES = [
  "agency", "saas", "services", "ecommerce",
  "construction", "consulting", "media", "education",
];

const VALID_TIERS = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"];

// ── Helpers ────────────────────────────────────────────────────────

async function flagOrPrompt<T>(
  flagValue: T | undefined,
  yes: boolean,
  promptFn: () => Promise<T>,
  flagName: string,
): Promise<T> {
  if (flagValue !== undefined) return flagValue;
  if (yes) {
    console.error(`Error: --${flagName} required in non-interactive mode`);
    process.exit(1);
  }
  return promptFn();
}

// ── Command ────────────────────────────────────────────────────────

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Create a new SpokeStack workspace (account + setup + seed)")
    .option("--email <email>", "Account email address")
    .option("--password <password>", "Account password")
    .option("--name <name>", "Your full name")
    .option("--org <orgName>", "Organization / workspace name")
    .option(
      "--template <industry>",
      `Industry template: ${VALID_TEMPLATES.join(", ")}`,
    )
    .option("--tier <tier>", "Subscription tier for seed", "ENTERPRISE")
    .option("--supabase-url <url>", "Supabase project URL (enables local setup)")
    .option("--supabase-key <key>", "Supabase anon key")
    .option("--agent-runtime-url <url>", "Agent runtime URL")
    .option("--agent-runtime-secret <secret>", "Agent runtime secret")
    .option("--skip-browser", "Do not open onboarding in browser")
    .option("-y, --yes", "Non-interactive mode (requires flags)")
    .action(async (opts) => {
      ui.welcomeBanner();
      ui.heading("Create your workspace");
      ui.line("Set up a new SpokeStack workspace in under 3 minutes.");
      ui.line("Account creation, environment setup, and database seeding -- all in one step.");
      ui.blank();

      const yes = Boolean(opts.yes);

      // ────────────────────────────────────────────────────────────
      // Step 1: Collect credentials
      // ────────────────────────────────────────────────────────────

      const email = await flagOrPrompt<string>(
        opts.email,
        yes,
        async () => {
          const { value } = await inquirer.prompt([
            {
              type: "input",
              name: "value",
              message: "Email address:",
              validate: (input: string) => {
                if (!input || !input.includes("@"))
                  return "Please enter a valid email address.";
                return true;
              },
            },
          ]);
          return value;
        },
        "email",
      );

      const password = await flagOrPrompt<string>(
        opts.password,
        yes,
        async () => {
          const { value } = await inquirer.prompt([
            {
              type: "password",
              name: "value",
              message: "Choose a password:",
              mask: "*",
              validate: (input: string) => {
                if (!input || input.length < 8)
                  return "Password must be at least 8 characters.";
                return true;
              },
            },
          ]);
          return value;
        },
        "password",
      );

      const name = await flagOrPrompt<string>(
        opts.name,
        yes,
        async () => {
          const { value } = await inquirer.prompt([
            {
              type: "input",
              name: "value",
              message: "Your name:",
              validate: (input: string) => {
                if (!input.trim()) return "Name is required.";
                return true;
              },
            },
          ]);
          return value;
        },
        "name",
      );

      // ────────────────────────────────────────────────────────────
      // Step 2: Sign up via Supabase Auth
      // ────────────────────────────────────────────────────────────

      const s1 = ui.spinner("Creating your account...");
      const signupRes = await apiPublicRequest<{
        user: { id: string; supabaseId: string };
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      }>("POST", "/api/v1/auth/signup", {
        email,
        password,
        name,
      });
      s1.stop();

      if (!signupRes.ok) {
        ui.error(signupRes.error || "Failed to create account.");
        if (signupRes.error?.includes("already")) {
          ui.blank();
          ui.info("Already have an account? Run `spokestack login` instead.");
        }
        process.exit(1);
      }

      ui.success("Account created");

      // ────────────────────────────────────────────────────────────
      // Step 3: Create user record (POST /api/v1/auth)
      // ────────────────────────────────────────────────────────────

      const tempAuth: AuthData = {
        accessToken: signupRes.data.accessToken,
        refreshToken: signupRes.data.refreshToken,
        expiresAt: signupRes.data.expiresAt,
        orgId: "",
        orgSlug: "",
        email,
        userName: name,
      };

      const s2 = ui.spinner("Creating user record...");
      const userRes = await apiPublicRequest<{
        user: { id: string };
      }>("POST", "/api/v1/auth", {
        supabaseId: signupRes.data.user.supabaseId,
        email,
        name,
      });
      s2.stop();

      if (!userRes.ok) {
        ui.warn(userRes.error || "User record creation returned an error (may already exist).");
      } else {
        ui.success("User record created");
      }

      // ────────────────────────────────────────────────────────────
      // Step 4: Create organization (PUT /api/v1/auth)
      // ────────────────────────────────────────────────────────────

      const orgName = await flagOrPrompt<string>(
        opts.org,
        yes,
        async () => {
          const { value } = await inquirer.prompt([
            {
              type: "input",
              name: "value",
              message: "Workspace name (your company or team):",
              validate: (input: string) => {
                if (!input.trim()) return "Workspace name is required.";
                return true;
              },
            },
          ]);
          return value;
        },
        "org",
      );

      const slug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const s3 = ui.spinner("Setting up your workspace...");
      const orgRes = await apiPublicRequest<{
        organization: { id: string; slug: string };
      }>("PUT", "/api/v1/auth", {
        supabaseId: signupRes.data.user.supabaseId,
        orgName,
        orgSlug: slug,
      });
      s3.stop();

      if (!orgRes.ok) {
        ui.error(orgRes.error || "Failed to create workspace.");
        process.exit(1);
      }

      ui.success("Workspace created");

      // ────────────────────────────────────────────────────────────
      // Step 5: Save auth
      // ────────────────────────────────────────────────────────────

      const authData: AuthData = {
        ...tempAuth,
        orgId: orgRes.data.organization.id,
        orgSlug: orgRes.data.organization.slug,
      };
      saveAuth(authData);
      ui.success("Authenticated and ready");

      // ────────────────────────────────────────────────────────────
      // Step 6: Local setup (if in a repo directory)
      // ────────────────────────────────────────────────────────────

      const cwd = process.cwd();
      const pkgPath = path.join(cwd, "package.json");
      const inRepo = fs.existsSync(pkgPath);

      if (inRepo && opts.supabaseUrl) {
        ui.blank();
        ui.heading("Local environment setup");

        const supabaseKey = opts.supabaseKey || "";
        const agentRuntimeUrl = opts.agentRuntimeUrl || "";
        const agentRuntimeSecret = opts.agentRuntimeSecret || "";

        const envPath = path.join(cwd, ".env.local");
        const envContent = [
          `NEXT_PUBLIC_SUPABASE_URL=${opts.supabaseUrl}`,
          `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseKey}`,
          `SUPABASE_SERVICE_ROLE_KEY=${supabaseKey}`,
          `AGENT_RUNTIME_URL=${agentRuntimeUrl}`,
          `AGENT_RUNTIME_SECRET=${agentRuntimeSecret}`,
          "",
        ].join("\n");

        fs.writeFileSync(envPath, envContent, "utf-8");
        ui.success(".env.local written");

        // Run prisma generate
        try {
          execSync("npx prisma generate", {
            cwd,
            stdio: "pipe",
          });
          ui.success("Prisma client generated");
        } catch {
          ui.warn("Prisma generate failed. Run 'npx prisma generate' manually.");
        }

        // Test Supabase connection
        try {
          const res = await fetch(`${opts.supabaseUrl}/rest/v1/`, {
            headers: { apikey: supabaseKey },
          });
          if (res.ok || res.status === 200) {
            ui.success("Supabase connection verified");
          } else {
            ui.warn(`Supabase responded with status ${res.status}`);
          }
        } catch {
          ui.warn("Could not reach Supabase. Check your URL.");
        }
      } else if (inRepo && !opts.supabaseUrl) {
        ui.blank();
        ui.line(
          `  ${ui.MUTED("Tip:")} Run ${ui.BOLD("spokestack setup")} to configure your local environment.`,
        );
      }

      // ────────────────────────────────────────────────────────────
      // Step 7: Seed database
      // ────────────────────────────────────────────────────────────

      const tier = opts.tier || "ENTERPRISE";
      const template = opts.template as string | undefined;

      ui.blank();
      ui.heading("Seeding database");

      const s4 = ui.spinner("Seeding...");

      const seedBody: Record<string, unknown> = {
        tier,
        onboardingComplete: false,
      };
      if (template) {
        if (VALID_TEMPLATES.includes(template.toLowerCase())) {
          seedBody.template = template.toLowerCase();
        } else {
          s4.stop();
          ui.warn(
            `Unknown template "${template}". Valid: ${VALID_TEMPLATES.join(", ")}`,
          );
        }
      }

      const seedRes = await apiRequestWithAuth<{
        seeded: boolean;
        details?: {
          usersCreated?: number;
          modulesInstalled?: string[];
          tasksCreated?: number;
          projectsCreated?: number;
        };
        message?: string;
      }>(authData, "POST", "/api/v1/admin/seed", seedBody);

      s4.stop();

      if (!seedRes.ok) {
        ui.warn(seedRes.error || "Seeding returned an error. You can run `spokestack seed` later.");
      } else {
        ui.success("Database seeded");

        if (seedRes.data.details) {
          const d = seedRes.data.details;
          if (d.modulesInstalled && d.modulesInstalled.length > 0)
            ui.line(`  Modules: ${d.modulesInstalled.join(", ")}`);
          if (d.tasksCreated)
            ui.line(`  Tasks created: ${d.tasksCreated}`);
          if (d.projectsCreated)
            ui.line(`  Projects created: ${d.projectsCreated}`);
        }
      }

      // ────────────────────────────────────────────────────────────
      // Step 8: Completion
      // ────────────────────────────────────────────────────────────

      ui.blank();
      ui.divider();
      ui.blank();
      ui.line(`  Welcome to ${ui.BOLD(orgName)}, ${name}!`);
      ui.blank();
      ui.line(`  Your ${ui.BOLD("Tasks Agent")} is ready. It can help you:`);
      ui.line(`    ${ui.MUTED("\u2022")} Create and manage tasks for your team`);
      ui.line(`    ${ui.MUTED("\u2022")} Track what everyone is working on`);
      ui.line(`    ${ui.MUTED("\u2022")} Organize work with task lists`);
      ui.blank();

      // Open onboarding in browser
      if (!opts.skipBrowser) {
        if (yes) {
          // In non-interactive mode, just show the URL
          const { apiBase } = getConfig();
          const onboardingUrl = `${apiBase}/onboarding?org=${authData.orgSlug}&token=${authData.accessToken}`;
          ui.line(`  Onboarding URL: ${ui.MUTED(onboardingUrl)}`);
        } else {
          const { startChat } = await inquirer.prompt([
            {
              type: "confirm",
              name: "startChat",
              message: "Open onboarding in your browser?",
              default: true,
            },
          ]);

          if (startChat) {
            const { apiBase } = getConfig();
            const onboardingUrl = `${apiBase}/onboarding?org=${authData.orgSlug}&token=${authData.accessToken}`;
            ui.blank();
            ui.info("Opening onboarding in your browser...");
            ui.line(`  ${ui.MUTED(onboardingUrl)}`);

            try {
              await open(onboardingUrl);
            } catch {
              ui.warn("Could not open browser automatically.");
              ui.line("  Copy and paste the URL above into your browser.");
            }
          }
        }
      }

      // Show next steps
      ui.blank();
      ui.line("  Get started:");
      ui.line(`    ${ui.BOLD("spokestack task add")}        ${ui.MUTED("Create your first task")}`);
      ui.line(`    ${ui.BOLD("spokestack agent chat")}      ${ui.MUTED("Talk to your Tasks Agent")}`);
      ui.line(`    ${ui.BOLD("spokestack status")}          ${ui.MUTED("Check workspace health")}`);

      if (inRepo) {
        ui.line(`    ${ui.BOLD("spokestack dev")}             ${ui.MUTED("Start the dev server")}`);
      }

      if (!template) {
        ui.blank();
        ui.line(
          `  ${ui.MUTED("Tip:")} Run ${ui.BOLD("spokestack init --template agency")} next time to install industry modules.`,
        );
        ui.line(
          `  ${ui.MUTED("Templates:")} ${VALID_TEMPLATES.join(", ")}`,
        );
      }

      ui.blank();
    });
}
