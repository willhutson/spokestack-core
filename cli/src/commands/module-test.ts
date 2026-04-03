import * as fs from "node:fs";
import * as path from "node:path";
import { post } from "../api.js";
import * as ui from "../ui.js";

interface TestOpts {
  skipExecution?: boolean;
  verbose?: boolean;
  json?: boolean;
}

interface ToolDef {
  name: string;
  method: string;
  path: string;
  description?: string;
  parameters?: Record<string, { type?: string; description?: string }>;
}

const FORBIDDEN_PREFIXES = [
  "/api/v1/admin/",
  "/api/v1/auth/",
  "/api/v1/marketplace/",
];

export async function moduleTestCommand(
  slugOrPath: string,
  opts: TestOpts
): Promise<void> {
  ui.heading(`Testing: ${slugOrPath}`);

  // Load module package
  const modulesDir = path.join(process.cwd(), "modules");
  const packagePath = path.join(modulesDir, slugOrPath, "module-package.json");

  if (!fs.existsSync(packagePath)) {
    ui.error(`Module package not found at: ${packagePath}`);
    ui.line(
      `  ${ui.MUTED("Hint:")} Run ${ui.BOLD(`spokestack module create ${slugOrPath}`)} first`
    );
    process.exit(1);
  }

  const modulePackage = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
  const tools: ToolDef[] = modulePackage.tools || [];
  const systemPrompt: string = modulePackage.systemPrompt || "";
  let allPassed = true;

  // Step 1: Manifest validation
  const s1 = ui.spinner("Validating manifest...");
  if (!modulePackage.manifest?.slug || !modulePackage.manifest?.name) {
    s1.stop();
    ui.error("Manifest invalid — missing slug or name");
    process.exit(1);
  }
  s1.stop(`Manifest valid (${modulePackage.manifest.name})`);

  // Step 2: Tool security check (local validation)
  const s2 = ui.spinner(`Checking ${tools.length} tools...`);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (tools.length === 0) {
    blockers.push("Module must define at least one tool");
  }
  if (tools.length > 50) {
    blockers.push("Module cannot define more than 50 tools");
  }

  const names = new Set<string>();
  for (const tool of tools) {
    if (names.has(tool.name)) {
      blockers.push(`Duplicate tool name: ${tool.name}`);
    }
    names.add(tool.name);

    if (!tool.path.startsWith("/api/v1/")) {
      blockers.push(`[${tool.name}] Path must start with /api/v1/. Got: ${tool.path}`);
    }

    for (const prefix of FORBIDDEN_PREFIXES) {
      if (tool.path.startsWith(prefix)) {
        blockers.push(`[${tool.name}] Forbidden path prefix: ${prefix}`);
      }
    }

    if (/^https?:\/\//.test(tool.path)) {
      blockers.push(`[${tool.name}] External URLs are not allowed`);
    }

    if (!["GET", "POST", "PATCH", "DELETE"].includes(tool.method)) {
      blockers.push(`[${tool.name}] Invalid method: ${tool.method}`);
    }

    if (!tool.description || tool.description.length < 10) {
      warnings.push(`[${tool.name}] Should have a meaningful description`);
    }

    for (const [paramName, paramDef] of Object.entries(tool.parameters || {})) {
      if (!paramDef.type) {
        blockers.push(`[${tool.name}] Parameter '${paramName}' must have a type`);
      }
    }
  }

  if (blockers.length > 0) {
    s2.stop();
    ui.error(`${blockers.length} security blockers found`);
    for (const b of blockers) {
      ui.line(`  ${ui.ERROR_COLOR("✗")} ${b}`);
    }
    ui.blank();
    ui.line(
      `  ${ui.MUTED("Hint:")} Fix all blockers before publishing.`
    );
    allPassed = false;
  } else {
    s2.stop(`${tools.length} tools passed security check`);
  }

  for (const w of warnings) {
    ui.warn(w);
  }

  // Step 3: System prompt check
  const INJECTION_PATTERNS = [
    /ignore (previous|all|the above) instructions/i,
    /you are now/i,
    /pretend (you are|to be)/i,
    /disregard (your|the) (system|previous)/i,
    /override (your|the) (instructions|prompt|system)/i,
    /forget (everything|what|your)/i,
    /<\/?system>/i,
    /\[INST\]/i,
  ];

  const injections = INJECTION_PATTERNS.filter((p) => p.test(systemPrompt));

  if (systemPrompt.length < 50) {
    ui.error("System prompt too short (< 50 chars)");
    allPassed = false;
  } else if (systemPrompt.length > 10000) {
    ui.error("System prompt too long (> 10,000 chars)");
    allPassed = false;
  } else if (injections.length > 0) {
    ui.error(
      `System prompt contains ${injections.length} injection pattern(s)`
    );
    allPassed = false;
  } else {
    ui.success(
      `System prompt clean (${systemPrompt.length} chars, no injection patterns)`
    );
  }

  // Step 4: Sandbox execution test (optional)
  if (!opts.skipExecution && allPassed) {
    const s4 = ui.spinner("Running sandbox execution tests...");

    const testRes = await post<{
      passed?: boolean;
      toolCount?: number;
      failedCount?: number;
      results?: Array<{
        tool: string;
        passed: boolean;
        statusCode?: number;
        elapsedMs?: number;
        slow?: boolean;
        error?: string;
      }>;
    }>("/api/v1/agents/ask", {
      agent_type: "module-builder-assistant",
      task: `Test module tools for "${modulePackage.manifest.name}". Run each tool against the sandbox and report pass/fail with status codes and timing.`,
      stream: false,
    });

    if (!testRes.ok || !testRes.data?.results) {
      s4.stop();
      ui.warn("Sandbox execution unavailable — skipping");
    } else {
      const results = testRes.data;
      if (!results.passed) {
        s4.stop();
        ui.error(
          `${results.failedCount}/${results.toolCount} tools failed sandbox execution`
        );
        allPassed = false;
      } else {
        s4.stop(
          `All ${results.toolCount} tools passed sandbox execution`
        );
      }

      if (opts.verbose && results.results) {
        for (const r of results.results) {
          const icon = r.passed ? ui.SUCCESS("✔") : ui.ERROR_COLOR("✗");
          const timing = r.elapsedMs ? ` (${r.elapsedMs}ms)` : "";
          const slow = r.slow ? ` ${ui.WARNING("⚠ slow")}` : "";
          ui.line(
            `  ${icon} ${r.tool} → ${r.statusCode || "error"}${timing}${slow}`
          );
          if (!r.passed && r.error) {
            ui.line(`      Error: ${r.error}`);
          }
        }
      }
    }
  }

  // Final output
  ui.blank();
  if (allPassed) {
    ui.success(
      `Ready to publish: ${ui.BOLD(`spokestack module publish ${slugOrPath}`)}`
    );
  } else {
    ui.error("Module has issues. Fix them before publishing.");
    process.exit(1);
  }

  if (opts.json) {
    ui.jsonOutput({
      passed: allPassed,
      blockers,
      warnings,
      toolCount: tools.length,
      promptLength: systemPrompt.length,
    });
  }
}
