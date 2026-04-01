import { Command } from "commander";
import inquirer from "inquirer";
import open from "open";
import { saveAuth, getConfig, type AuthData } from "../auth.js";
import { apiPublicRequest, apiRequest } from "../api.js";
import * as ui from "../ui.js";

const VALID_TEMPLATES = [
  "agency", "saas", "services", "ecommerce",
  "construction", "consulting", "media", "education",
];

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Create a new SpokeStack workspace")
    .option(
      "--template <industry>",
      `Industry template: ${VALID_TEMPLATES.join(", ")}`
    )
    .action(async (opts) => {
      ui.welcomeBanner();
      ui.heading("Create your workspace");
      ui.line("Set up a new SpokeStack workspace in under 3 minutes.");
      ui.line("Your Tasks Agent will be ready when you're done.");
      ui.blank();

      // Step 1: Collect credentials
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "email",
          message: "Email address:",
          validate: (input: string) => {
            if (!input || !input.includes("@")) return "Please enter a valid email address.";
            return true;
          },
        },
        {
          type: "password",
          name: "password",
          message: "Choose a password:",
          mask: "*",
          validate: (input: string) => {
            if (!input || input.length < 8) return "Password must be at least 8 characters.";
            return true;
          },
        },
        {
          type: "input",
          name: "name",
          message: "Your name:",
          validate: (input: string) => {
            if (!input.trim()) return "Name is required.";
            return true;
          },
        },
      ]);

      // Step 2: Sign up
      const s1 = ui.spinner("Creating your account...");
      const signupRes = await apiPublicRequest<{
        user: { id: string; supabaseId: string };
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      }>("POST", "/api/v1/auth/signup", {
        email: answers.email,
        password: answers.password,
        name: answers.name,
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

      // Step 3: Create organization
      ui.blank();
      const orgAnswers = await inquirer.prompt([
        {
          type: "input",
          name: "orgName",
          message: "Workspace name (your company or team):",
          validate: (input: string) => {
            if (!input.trim()) return "Workspace name is required.";
            return true;
          },
        },
      ]);

      const slug = orgAnswers.orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const s2 = ui.spinner("Setting up your workspace...");

      const tempAuth: AuthData = {
        accessToken: signupRes.data.accessToken,
        refreshToken: signupRes.data.refreshToken,
        expiresAt: signupRes.data.expiresAt,
        orgId: "",
        orgSlug: slug,
        email: answers.email,
        userName: answers.name,
      };

      const orgRes = await apiPublicRequest<{
        organization: { id: string; slug: string };
      }>("PUT", "/api/v1/auth", {
        supabaseId: signupRes.data.user.supabaseId,
        orgName: orgAnswers.orgName,
        orgSlug: slug,
      });
      s2.stop();

      if (!orgRes.ok) {
        ui.error(orgRes.error || "Failed to create workspace.");
        process.exit(1);
      }

      ui.success("Workspace created");

      // Step 4: Save auth
      const authData: AuthData = {
        ...tempAuth,
        orgId: orgRes.data.organization.id,
        orgSlug: orgRes.data.organization.slug,
      };
      saveAuth(authData);
      ui.success("Authenticated and ready");

      // Step 5: Install template modules if --template provided
      const template = opts.template as string | undefined;
      if (template) {
        if (!VALID_TEMPLATES.includes(template.toLowerCase())) {
          ui.warn(
            `Unknown template "${template}". Valid: ${VALID_TEMPLATES.join(", ")}`
          );
        } else {
          const s3 = ui.spinner(
            `Installing ${template} template modules...`
          );
          const recRes = await apiRequest<{
            label: string;
            recommended: Array<{
              moduleType: string;
              name: string;
              canInstall: boolean;
            }>;
          }>("GET", `/api/v1/modules/recommend?industry=${template.toLowerCase()}`);
          s3.stop();

          if (recRes.ok && recRes.data.recommended) {
            const toInstall = recRes.data.recommended
              .filter((m) => m.canInstall)
              .map((m) => m.moduleType);

            if (toInstall.length > 0) {
              const names = recRes.data.recommended
                .filter((m) => m.canInstall)
                .map((m) => m.name);
              ui.info(
                `Installing ${toInstall.length} modules: ${names.join(", ")}...`
              );

              const s4 = ui.spinner("Installing modules...");
              const batchRes = await apiRequest<{
                installed: Array<{ moduleType: string; success: boolean }>;
                skipped: Array<{
                  moduleType: string;
                  requiredTier?: string;
                }>;
              }>("POST", "/api/v1/modules/install-batch", {
                moduleTypes: toInstall,
              });
              s4.stop();

              if (batchRes.ok) {
                for (const m of batchRes.data.installed) {
                  ui.success(`${m.moduleType} installed`);
                }
                for (const m of batchRes.data.skipped) {
                  ui.warn(
                    `${m.moduleType} skipped (requires ${m.requiredTier})`
                  );
                }
              }
            }

            const skippedNames = recRes.data.recommended
              .filter((m) => !m.canInstall)
              .map((m) => `${m.name} (upgrade required)`);
            if (skippedNames.length > 0) {
              ui.line(
                `  ${ui.MUTED("Skipped:")} ${skippedNames.join(", ")}`
              );
            }
          }
          ui.blank();
        }
      }

      // Step 6: Offer onboarding conversation
      ui.blank();
      ui.divider();
      ui.blank();
      ui.line(`  Welcome to ${ui.BOLD(orgAnswers.orgName)}, ${answers.name}!`);
      ui.blank();
      ui.line(`  Your ${ui.BOLD("Tasks Agent")} is ready. It can help you:`);
      ui.line(`    ${ui.MUTED("\u2022")} Create and manage tasks for your team`);
      ui.line(`    ${ui.MUTED("\u2022")} Track what everyone is working on`);
      ui.line(`    ${ui.MUTED("\u2022")} Organize work with task lists`);
      ui.blank();

      const { startChat } = await inquirer.prompt([
        {
          type: "confirm",
          name: "startChat",
          message: "Want to set up your workspace with the onboarding agent?",
          default: true,
        },
      ]);

      if (startChat) {
        const { apiBase } = getConfig();
        const onboardingUrl = `${apiBase}/onboarding?org=${authData.orgSlug}&token=${authData.accessToken}`;
        ui.blank();
        ui.info("Opening onboarding in your browser...");
        ui.line(`  ${ui.MUTED(onboardingUrl)}`);
        ui.blank();

        try {
          await open(onboardingUrl);
        } catch {
          ui.warn("Could not open browser automatically.");
          ui.line("  Copy and paste the URL above into your browser.");
        }

        ui.line("  Or start a conversation right here:");
        ui.line(`  ${ui.BOLD("spokestack agent chat")}`);
      } else {
        ui.blank();
        ui.line("  Get started:");
        ui.line(`    ${ui.BOLD("spokestack task add")}        ${ui.MUTED("Create your first task")}`);
        ui.line(`    ${ui.BOLD("spokestack agent chat")}      ${ui.MUTED("Talk to your Tasks Agent")}`);
        ui.line(`    ${ui.BOLD("spokestack status")}          ${ui.MUTED("Check workspace health")}`);
      }

      if (!template) {
        ui.blank();
        ui.line(
          `  ${ui.MUTED("Tip:")} Run ${ui.BOLD("spokestack init --template agency")} to install industry modules.`
        );
        ui.line(
          `  ${ui.MUTED("Templates:")} ${VALID_TEMPLATES.join(", ")}`
        );
      }

      ui.blank();
    });
}
