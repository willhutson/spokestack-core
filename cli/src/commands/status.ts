import * as fs from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import { get } from "../api.js";
import { loadAuth, getConfig } from "../auth.js";
import * as ui from "../ui.js";

// ── Types ──────────────────────────────────────────────────────────

interface BillingInfo { tier: string; status: string }
interface ModuleInfo { name: string; slug: string }
interface MemberInfo { id: string }
interface OnboardingInfo { onboardingComplete: boolean }
interface CountResponse<K extends string> { [key: string]: unknown } // generic bucket

// ── Helpers ────────────────────────────────────────────────────────

async function probe(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

function settled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

// ── Command ────────────────────────────────────────────────────────

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show environment and workspace health")
    .option("--format <fmt>", "Output format: table, json", "table")
    .action(async (opts) => {
      const auth = loadAuth();
      if (!auth) {
        ui.error("Not logged in. Run `spokestack login` first.");
        process.exit(1);
      }

      const { apiBase } = getConfig();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const agentRuntimeUrl = process.env.AGENT_RUNTIME_URL;
      const envLocalExists = fs.existsSync(path.resolve(process.cwd(), ".env.local"));

      // Fire all checks in parallel
      const [
        billingR, modulesR, membersR,
        tasksR, projectsR, briefsR, ordersR,
        onboardingR, dbR, agentR, appR,
      ] = await Promise.allSettled([
        get<BillingInfo>("/api/v1/billing"),
        get<{ modules: ModuleInfo[] }>("/api/v1/modules/installed"),
        get<{ members: MemberInfo[] }>("/api/v1/members"),
        get<{ tasks: unknown[] }>("/api/v1/tasks"),
        get<{ projects: unknown[] }>("/api/v1/projects"),
        get<{ briefs: unknown[] }>("/api/v1/briefs"),
        get<{ orders: unknown[] }>("/api/v1/orders"),
        get<OnboardingInfo>("/api/v1/onboarding"),
        supabaseUrl ? probe(`${supabaseUrl}/rest/v1/`, 3000) : Promise.resolve(false),
        agentRuntimeUrl ? probe(`${agentRuntimeUrl}/api/v1/health`, 3000) : Promise.resolve(false),
        probe("http://localhost:3000", 2000),
      ]);

      // Extract values
      const billing  = settled(billingR)?.ok ? (settled(billingR) as { data: BillingInfo }).data : null;
      const modules  = settled(modulesR)?.ok ? (settled(modulesR) as { data: { modules: ModuleInfo[] } }).data.modules : [];
      const members  = settled(membersR)?.ok ? (settled(membersR) as { data: { members: MemberInfo[] } }).data.members : [];
      const tasks    = settled(tasksR)?.ok   ? (settled(tasksR) as { data: { tasks: unknown[] } }).data.tasks : [];
      const projects = settled(projectsR)?.ok ? (settled(projectsR) as { data: { projects: unknown[] } }).data.projects : [];
      const briefs   = settled(briefsR)?.ok  ? (settled(briefsR) as { data: { briefs: unknown[] } }).data.briefs : [];
      const orders   = settled(ordersR)?.ok  ? (settled(ordersR) as { data: { orders: unknown[] } }).data.orders : [];
      const onboarding = settled(onboardingR)?.ok ? (settled(onboardingR) as { data: OnboardingInfo }).data : null;
      const dbOk     = settled(dbR) === true;
      const agentOk  = settled(agentR) === true;
      const appOk    = settled(appR) === true;

      // JSON mode
      if (opts.format === "json") {
        ui.jsonOutput({
          version: "0.1.0",
          org: auth.orgSlug,
          environment: { envLocal: envLocalExists, supabase: supabaseUrl || null, database: dbOk, agentRuntime: { url: agentRuntimeUrl || null, connected: agentOk }, app: { url: "http://localhost:3000", running: appOk } },
          workspace: { plan: billing?.tier || "unknown", planStatus: billing?.status || "unknown", modules: modules.length, moduleList: modules.map(m => m.slug), team: members.length, onboardingComplete: onboarding?.onboardingComplete ?? null },
          data: { tasks: tasks.length, projects: projects.length, briefs: briefs.length, orders: orders.length },
        });
        return;
      }

      // ── Header
      ui.blank();
      ui.line(`${ui.LOGO} ${ui.MUTED("v0.1.0")} — ${ui.BOLD(auth.orgSlug)}`);
      ui.blank();

      // ── Environment
      ui.line(`${ui.BOLD("Environment")}`);
      check(envLocalExists, ".env.local exists");
      check(!!supabaseUrl, supabaseUrl ? `Supabase: ${supabaseUrl}` : "Supabase: not configured");
      check(dbOk, `Database: ${dbOk ? "connected" : "not reachable"}`);
      check(agentOk, `Agent runtime: ${agentRuntimeUrl || "not configured"} (${agentOk ? "connected" : "not reachable"})`);
      check(appOk, `App: http://localhost:3000 (${appOk ? "running" : "not running"})`);
      ui.blank();

      // ── Workspace
      ui.line(`${ui.BOLD("Workspace:")} ${auth.orgSlug}`);
      ui.line(`  Plan: ${billing ? `${billing.tier} (${billing.status})` : ui.MUTED("unknown")}`);
      ui.line(`  Modules: ${modules.length} installed${modules.length ? ` (${modules.map(m => m.slug).join(", ")})` : ""}`);
      ui.line(`  Team: ${members.length} members`);
      ui.line(`  Onboarding: ${onboarding ? (onboarding.onboardingComplete ? "complete" : "incomplete") : ui.MUTED("unknown")}`);
      ui.blank();

      // ── Data
      ui.line(`${ui.BOLD("Data")}`);
      ui.line(`  Tasks: ${tasks.length}`);
      ui.line(`  Projects: ${projects.length}`);
      ui.line(`  Briefs: ${briefs.length}`);
      ui.line(`  Orders: ${orders.length}`);
      ui.blank();

      // ── Marketplace (optional — never fail status)
      try {
        const myModulesRes = await get<{
          modules: Array<{
            name: string;
            status: string;
            installCount: number;
            avgRating: number;
          }>;
        }>("/api/v1/marketplace/my-modules");

        if (myModulesRes.ok && myModulesRes.data.modules.length > 0) {
          const myModules = myModulesRes.data.modules;
          const published = myModules.filter((m) => m.status === "PUBLISHED");
          const totalInstalls = published.reduce((s, m) => s + m.installCount, 0);

          ui.line(`${ui.BOLD("Marketplace")}`);
          ui.line(`  Published modules: ${published.length}`);
          ui.line(`  Total installs:    ${totalInstalls}`);
          for (const m of published) {
            ui.line(`    ${ui.SUCCESS("✔")} ${m.name} — ${m.installCount} installs, ${m.avgRating.toFixed(1)}★`);
          }

          const pending = myModules.filter((m) => m.status === "PENDING_REVIEW");
          if (pending.length > 0) {
            ui.line(`  Pending review:    ${pending.length}`);
          }
          ui.blank();
        }
      } catch {
        // Marketplace section is optional
      }
    });
}

function check(ok: boolean, label: string): void {
  if (ok) {
    ui.success(label);
  } else {
    ui.warn(label);
  }
}
