import { Command } from "commander";
import inquirer from "inquirer";
import open from "open";
import { post } from "../api.js";
import { loadAuth, getConfig } from "../auth.js";
import * as ui from "../ui.js";

export function registerConnectCommand(program: Command): void {
  const connect = program
    .command("connect")
    .description("Connect integrations to your workspace");

  // ── connect slack ─────────────────────────────────────────────────

  connect
    .command("slack")
    .description("Connect Slack to your workspace")
    .action(async () => {
      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in. Run `spokestack login` first.");
        process.exit(1);
      }

      ui.heading("Connect Slack");
      ui.line("Link your Slack workspace so your agents can:");
      ui.line(`  ${ui.MUTED("\u2022")} Send task notifications to channels`);
      ui.line(`  ${ui.MUTED("\u2022")} Receive commands via Slack messages`);
      ui.line(`  ${ui.MUTED("\u2022")} Post project updates automatically`);
      ui.blank();

      const { proceed } = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceed",
          message: "Open Slack authorization in your browser?",
          default: true,
        },
      ]);

      if (!proceed) {
        ui.info("Cancelled. Run `spokestack connect slack` when ready.");
        return;
      }

      const s = ui.spinner("Preparing Slack authorization...");
      const res = await post<{ authUrl: string; message: string }>(
        "/api/v1/integrations/slack/connect",
        {}
      );
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const authUrl = res.data.authUrl;
      if (authUrl) {
        try {
          await open(authUrl);
          ui.success("Slack authorization opened in your browser.");
          ui.line("  Complete the OAuth flow, then return here.");
        } catch {
          ui.warn("Could not open browser. Visit this URL:");
          ui.line(`  ${authUrl}`);
        }
      } else {
        ui.success(res.data.message || "Slack connection initiated.");
      }

      ui.blank();
      ui.info("After connecting, your agents will be able to interact via Slack.");
      ui.blank();
    });

  // ── connect whatsapp ──────────────────────────────────────────────

  connect
    .command("whatsapp")
    .description("Set up WhatsApp as a workspace surface")
    .action(async () => {
      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in. Run `spokestack login` first.");
        process.exit(1);
      }

      ui.heading("Connect WhatsApp");
      ui.line("Set up WhatsApp as a surface for your workspace.");
      ui.line("Your agents will be reachable via WhatsApp messages and voice notes.");
      ui.blank();

      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "phone",
          message: "WhatsApp phone number (with country code, e.g. +971501234567):",
          validate: (input: string) => {
            if (!input.startsWith("+") || input.length < 10) {
              return "Enter a valid phone number with country code (e.g. +971501234567).";
            }
            return true;
          },
        },
      ]);

      const s = ui.spinner("Setting up WhatsApp...");
      const res = await post<{
        message: string;
        verificationSent: boolean;
        qrCodeUrl?: string;
      }>("/api/v1/integrations/whatsapp/connect", {
        phone: answers.phone,
      });
      s.stop();

      if (ui.handleError(res.error, res.upgradeRequired, res.requiredTier)) {
        process.exit(1);
      }

      const result = res.data;

      if (result.verificationSent) {
        ui.success("Verification message sent to your WhatsApp.");
        ui.line("  Reply with the code to complete setup.");
      } else if (result.qrCodeUrl) {
        ui.info("Scan this QR code with WhatsApp:");
        ui.line(`  ${result.qrCodeUrl}`);
        const { apiBase } = getConfig();
        try {
          await open(`${apiBase}/integrations/whatsapp/qr?org=${auth.orgSlug}`);
        } catch {
          // Browser open is optional
        }
      } else {
        ui.success(result.message || "WhatsApp setup initiated.");
      }

      ui.blank();
      ui.line("  Once connected, you can:");
      ui.line(`    ${ui.MUTED("\u2022")} Send voice notes to create tasks`);
      ui.line(`    ${ui.MUTED("\u2022")} Ask your agent questions via text`);
      ui.line(`    ${ui.MUTED("\u2022")} Receive task and project notifications`);
      ui.blank();
    });
}
