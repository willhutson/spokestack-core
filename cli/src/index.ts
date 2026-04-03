#!/usr/bin/env node

import { Command } from "commander";
import { registerInitCommand } from "./commands/init.js";
import { registerLoginCommand, registerLogoutCommand, registerWhoamiCommand } from "./commands/login.js";
import { registerTaskCommand } from "./commands/task.js";
import { registerProjectCommand } from "./commands/project.js";
import { registerBriefCommand } from "./commands/brief.js";
import { registerOrderCommand, registerCustomerCommand } from "./commands/order.js";
import { registerAgentCommand } from "./commands/agent.js";
import { registerModuleCommand } from "./commands/module.js";
import { registerWorkspaceCommand } from "./commands/workspace.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerUpgradeCommand } from "./commands/upgrade.js";
import { registerConnectCommand } from "./commands/connect.js";
import { registerExportCommand } from "./commands/export.js";
import { registerTenantCommand } from "./commands/tenant.js";
import { registerInstanceCommand } from "./commands/instance.js";
import { registerModulesCommand } from "./commands/modules.js";
import { registerSetupCommand } from "./commands/setup.js";
import { registerSeedCommand } from "./commands/seed.js";
import { registerDevCommand } from "./commands/dev.js";
import { registerDeployCommand } from "./commands/deploy.js";
import { registerMarketplaceCommand } from "./commands/marketplace.js";

const program = new Command();

program
  .name("spokestack")
  .description("Agent-first work infrastructure — CLI")
  .version("0.1.0", "-v, --version", "Show CLI version")
  .option("--no-color", "Disable colored output")
  .hook("preAction", () => {
    if (program.opts().color === false) {
      process.env.NO_COLOR = "1";
    }
  });

// Register all commands
registerInitCommand(program);
registerLoginCommand(program);
registerLogoutCommand(program);
registerWhoamiCommand(program);
registerTaskCommand(program);
registerProjectCommand(program);
registerBriefCommand(program);
registerOrderCommand(program);
registerCustomerCommand(program);
registerAgentCommand(program);
registerModuleCommand(program);
registerWorkspaceCommand(program);
registerStatusCommand(program);
registerUpgradeCommand(program);
registerConnectCommand(program);
registerExportCommand(program);
registerTenantCommand(program);
registerInstanceCommand(program);
registerModulesCommand(program);
registerSetupCommand(program);
registerSeedCommand(program);
registerDevCommand(program);
registerDeployCommand(program);
registerMarketplaceCommand(program);

// Global error handling
program.exitOverride();

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    // Commander throws on --help and --version; those are fine
    if (err instanceof Error && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "commander.helpDisplayed" || code === "commander.version") {
        process.exit(0);
      }
    }

    // Unhandled errors
    if (err instanceof Error) {
      console.error(`\n  Error: ${err.message}\n`);
    }
    process.exit(1);
  }
}

main();
