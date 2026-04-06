import { get } from "../api.js";
import * as ui from "../ui.js";

interface ToolDefinition {
  name: string;
  description: string;
  method: string;
  path: string;
  parameters?: Record<string, unknown>;
  fixedBody?: Record<string, unknown>;
}

interface RegistryResponse {
  toolRegistry: Record<string, ToolDefinition>;
  agentTools: Record<string, string[]>;
}

interface SyncOpts {
  url?: string;
  validate?: boolean;
  json?: boolean;
}

export async function moduleSyncCommand(
  moduleName: string | undefined,
  opts: SyncOpts
): Promise<void> {
  ui.heading("Module Tool Sync");

  const baseUrl =
    opts.url || process.env.AGENT_RUNTIME_URL || "http://localhost:8100";

  const s = ui.spinner(`Fetching tool registry from ${baseUrl}...`);

  // Fetch the agent builder registry
  let registry: RegistryResponse;
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/agents/registry`
    );
    if (!res.ok) {
      s.stop();
      ui.error(`Registry fetch failed: ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    registry = (await res.json()) as RegistryResponse;
  } catch (err: unknown) {
    s.stop();
    ui.error(
      `Could not reach agent builder at ${baseUrl}. Is it running?`
    );
    ui.line(
      `  ${ui.MUTED("Hint:")} Set AGENT_RUNTIME_URL or use --url <url>`
    );
    process.exit(1);
  }

  const toolCount = Object.keys(registry.toolRegistry || {}).length;
  const agentCount = Object.keys(registry.agentTools || {}).length;
  s.stop(`Registry loaded: ${toolCount} tools, ${agentCount} agent types`);

  if (toolCount === 0) {
    ui.warn("Tool registry is empty. Nothing to sync.");
    return;
  }

  // Report what's available
  if (opts.json) {
    ui.jsonOutput({
      toolCount,
      agentCount,
      tools: Object.keys(registry.toolRegistry),
      agents: Object.keys(registry.agentTools),
    });
    return;
  }

  ui.blank();
  ui.line(`  ${ui.BOLD("Agent Types with Tools:")}`);

  const agentEntries = Object.entries(registry.agentTools || {});
  const filtered = moduleName
    ? agentEntries.filter(
        ([key]) =>
          key.toLowerCase().includes(moduleName.toLowerCase())
      )
    : agentEntries;

  if (filtered.length === 0 && moduleName) {
    ui.warn(`No agent type matching "${moduleName}" found in registry`);
    ui.blank();
    ui.line(`  Available agent types:`);
    for (const [key] of agentEntries.slice(0, 10)) {
      ui.line(`    ${key}`);
    }
    if (agentEntries.length > 10) {
      ui.line(`    ... and ${agentEntries.length - 10} more`);
    }
    return;
  }

  let totalTools = 0;
  for (const [agentType, toolNames] of filtered) {
    const resolved = toolNames
      .map((name) => registry.toolRegistry[name])
      .filter(Boolean);

    const missing = toolNames.length - resolved.length;
    totalTools += resolved.length;

    const status =
      missing > 0
        ? ui.WARNING(`${resolved.length}/${toolNames.length} tools`)
        : ui.SUCCESS(`${resolved.length} tools`);

    ui.line(`  ${agentType.padEnd(30)} ${status}`);

    if (missing > 0) {
      const missingNames = toolNames.filter(
        (name) => !registry.toolRegistry[name]
      );
      for (const name of missingNames) {
        ui.line(`    ${ui.ERROR_COLOR("✗")} ${name} (not in registry)`);
      }
    }
  }

  ui.blank();
  ui.line(`  ${ui.BOLD("Total:")} ${filtered.length} agent types, ${totalTools} tools resolved`);

  if (opts.validate) {
    ui.blank();
    ui.line(`  ${ui.BOLD("Validation:")}`);
    let valid = 0;
    let invalid = 0;

    for (const [agentType, toolNames] of filtered) {
      const resolved = toolNames
        .map((name) => registry.toolRegistry[name])
        .filter(Boolean);

      let issues = 0;
      for (const tool of resolved) {
        if (!tool.path?.startsWith("/api/v1/")) issues++;
        if (!["GET", "POST", "PATCH", "DELETE"].includes(tool.method))
          issues++;
      }

      if (issues > 0) {
        ui.line(`  ${ui.ERROR_COLOR("✗")} ${agentType}: ${issues} issue(s)`);
        invalid++;
      } else {
        ui.line(`  ${ui.SUCCESS("✔")} ${agentType}: all tools valid`);
        valid++;
      }
    }

    ui.blank();
    ui.line(`  ${valid} valid, ${invalid} invalid`);
    if (invalid > 0) process.exit(1);
  }

  ui.blank();
  ui.success("Sync check complete");
  ui.line(
    `  ${ui.MUTED("To sync manifests, run:")} npm run sync-tools ${ui.MUTED("in spokestack-modules")}`
  );
  ui.blank();
}
