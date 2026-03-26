import { Command } from "commander";
import inquirer from "inquirer";
import open from "open";
import { get, post } from "../api.js";
import { loadAuth, getConfig } from "../auth.js";
import * as ui from "../ui.js";

interface BillingInfo {
  billing: {
    tier: string;
    status: string;
    stripeCustomerId?: string;
  };
  tier: {
    type: string;
    name: string;
    priceCents: number;
    maxMembers: number;
    features: string[];
  } | null;
}

const TIERS = [
  {
    type: "FREE",
    name: "Free",
    price: "$0",
    agents: "Tasks Agent",
    members: "3 members",
    highlight: false,
  },
  {
    type: "STARTER",
    name: "Starter",
    price: "$29/mo",
    agents: "Tasks + Projects Agents",
    members: "10 members",
    highlight: false,
  },
  {
    type: "PRO",
    name: "Pro",
    price: "$59/mo",
    agents: "Tasks + Projects + Briefs Agents",
    members: "25 members",
    highlight: true,
  },
  {
    type: "BUSINESS",
    name: "Business",
    price: "$149/mo",
    agents: "All Agents + Unlimited Marketplace",
    members: "50 members",
    highlight: false,
  },
];

export function registerUpgradeCommand(program: Command): void {
  program
    .command("upgrade")
    .description("Upgrade your workspace tier")
    .option("--tier <tier>", "Target tier (STARTER, PRO, BUSINESS)")
    .action(async (opts) => {
      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in. Run `spokestack login` first.");
        process.exit(1);
      }

      // Get current billing info
      const s = ui.spinner("Loading billing info...");
      const billingRes = await get<BillingInfo>("/api/v1/billing");
      s.stop();

      if (ui.handleError(billingRes.error)) {
        process.exit(1);
      }

      const currentTier = billingRes.data.billing.tier;
      const currentIdx = TIERS.findIndex((t) => t.type === currentTier);

      ui.heading("Upgrade Your Workspace");
      ui.line(`  Current plan: ${ui.BOLD(currentTier)}`);
      ui.blank();

      // Show tier comparison
      for (const tier of TIERS) {
        const isCurrent = tier.type === currentTier;
        const prefix = isCurrent ? ui.SUCCESS("\u25CF") : "  ";
        const name = tier.highlight ? ui.BOLD(ui.INFO(tier.name)) : ui.BOLD(tier.name);
        const label = isCurrent ? `${name} ${ui.MUTED("(current)")}` : name;

        ui.line(`  ${prefix} ${label}  ${ui.MUTED(tier.price)}`);
        ui.line(`      ${tier.agents}`);
        ui.line(`      ${ui.MUTED(tier.members)}`);
        ui.blank();
      }

      // Determine target tier
      let targetTier = opts.tier?.toUpperCase();

      if (!targetTier) {
        const availableTiers = TIERS.filter(
          (_, i) => i > currentIdx
        );

        if (availableTiers.length === 0) {
          ui.info("You're on the highest tier. Contact us for Enterprise pricing.");
          ui.line(`  ${ui.MUTED("enterprise@spokestack.dev")}`);
          ui.blank();
          return;
        }

        const { selected } = await inquirer.prompt([
          {
            type: "list",
            name: "selected",
            message: "Select a plan:",
            choices: availableTiers.map((t) => ({
              name: `${t.name} (${t.price}) — ${t.agents}`,
              value: t.type,
            })),
          },
        ]);
        targetTier = selected;
      }

      if (!targetTier) return;

      const targetInfo = TIERS.find((t) => t.type === targetTier);
      if (!targetInfo) {
        ui.error(`Unknown tier: ${targetTier}`);
        process.exit(1);
      }

      // Confirm
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `Upgrade to ${targetInfo.name} (${targetInfo.price})?`,
          default: true,
        },
      ]);

      if (!confirm) {
        ui.info("Upgrade cancelled.");
        return;
      }

      // Initiate upgrade
      const s2 = ui.spinner("Preparing checkout...");
      const upgradeRes = await post<{
        billing: { tier: string };
        checkoutUrl?: string;
        message: string;
      }>("/api/v1/billing", { targetTier });
      s2.stop();

      if (ui.handleError(upgradeRes.error)) {
        process.exit(1);
      }

      const result = upgradeRes.data;

      if (result.checkoutUrl) {
        ui.info("Opening Stripe checkout in your browser...");
        try {
          await open(result.checkoutUrl);
          ui.success("Checkout opened. Complete payment in your browser.");
        } catch {
          ui.warn("Could not open browser. Visit this URL:");
          ui.line(`  ${result.checkoutUrl}`);
        }
      } else {
        // Dev mode: direct upgrade
        ui.success(result.message || `Upgraded to ${targetTier}!`);

        const newAgents: Record<string, string> = {
          STARTER: "Projects Agent",
          PRO: "Briefs Agent",
          BUSINESS: "Orders Agent",
        };

        const newAgent = newAgents[targetTier];
        if (newAgent) {
          ui.blank();
          ui.line(`  Your ${ui.BOLD(newAgent)} is now active!`);
          ui.line(`  Start a conversation: ${ui.BOLD("spokestack agent chat")}`);
        }
      }

      ui.blank();
    });
}
