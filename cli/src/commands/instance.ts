import { Command } from "commander";
import inquirer from "inquirer";
import { apiRequest } from "../api.js";
import * as ui from "../ui.js";

export function registerInstanceCommand(program: Command): void {
  const instance = program
    .command("instance")
    .description("Configure your SpokeStack instance");

  instance
    .command("configure")
    .description("Set up domain, channels, and branding")
    .option("--domain <domain>", "Custom domain (e.g. app.client.com)")
    .action(async (opts) => {
      ui.blank();
      ui.heading("Configure Instance");

      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "domain",
          message: "Custom domain (optional, press Enter to skip):",
          default: opts.domain ?? "",
        },
        {
          type: "checkbox",
          name: "channels",
          message: "Enable channels:",
          choices: [
            { name: "WhatsApp", value: "whatsapp" },
            { name: "Voice", value: "voice" },
            { name: "Web Widget", value: "webWidget" },
          ],
          default: ["webWidget"],
        },
        {
          type: "input",
          name: "brandingSlug",
          message: "Branding name (press Enter to use org name):",
          default: "",
        },
      ]);

      const channels: Record<string, boolean> = {};
      for (const ch of ["whatsapp", "voice", "webWidget"]) {
        channels[ch] = answers.channels.includes(ch);
      }

      const body: Record<string, unknown> = { channels };
      if (answers.domain) body.domain = answers.domain;
      if (answers.brandingSlug) {
        body.branding = { orgName: answers.brandingSlug };
      }

      const s = ui.spinner("Configuring instance...");
      const res = await apiRequest<{
        success: boolean;
        domainStatus?: string;
        settings: Record<string, unknown>;
      }>("PUT", "/api/v1/instance/configure", body);
      s.stop();

      if (!res.ok) {
        ui.error(res.error ?? "Configuration failed.");
        return;
      }

      ui.success("Instance configured.");

      if (res.data.domainStatus) {
        ui.line(`  Domain: ${answers.domain} — status: ${res.data.domainStatus}`);
        if (res.data.domainStatus === "pending") {
          ui.line("  DNS propagation may take a few minutes.");
        }
      }

      const enabledChannels = Object.entries(channels)
        .filter(([, v]) => v)
        .map(([k]) => k);
      ui.line(`  Channels: ${enabledChannels.join(", ") || "none"}`);
      ui.blank();
    });
}
