import { Command } from "commander";
import inquirer from "inquirer";
import { get, post } from "../api.js";
import * as ui from "../ui.js";

// ── Types ──────────────────────────────────────────────────────────

interface BrowseModule {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  category: string;
  industry: string | null;
  installCount: number;
  avgRating: number;
  reviewCount: number;
  pricing: { type: string; priceCents?: number; monthlyPriceCents?: number };
  qualityScore: number;
  version: string;
}

interface DetailModule extends BrowseModule {
  description: string;
  tools: Array<{ name: string; method: string; path: string; description: string }>;
  systemPrompt: string;
  isInstalled: boolean;
  installedVersion: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────

function renderStars(rating: number): string {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function priceLabel(pricing: {
  type: string;
  priceCents?: number;
  monthlyPriceCents?: number;
}): string {
  if (pricing.type === "free") return ui.SUCCESS("Free");
  if (pricing.type === "paid")
    return ui.formatCurrency(pricing.priceCents || 0, "AED");
  return `${ui.formatCurrency(pricing.monthlyPriceCents || 0, "AED")}/mo`;
}

// ── Register ───────────────────────────────────────────────────────

export function registerMarketplaceCommand(program: Command): void {
  const marketplace = program
    .command("marketplace")
    .description("Browse and install modules from the SpokeStack Marketplace");

  // marketplace (default: browse)
  marketplace
    .command("browse", { isDefault: true })
    .description("Browse published marketplace modules")
    .option("--sort <sort>", "Sort: popular, newest, rating", "popular")
    .option("--category <category>", "Filter by category")
    .option("--yes", "Skip prompts")
    .option("--json", "Output JSON")
    .action(async (opts) => {
      const s = ui.spinner("Loading marketplace...");

      const params = new URLSearchParams();
      params.set("sort", opts.sort || "popular");
      params.set("limit", "20");
      if (opts.category) params.set("category", opts.category);

      const res = await get<{
        modules: BrowseModule[];
        pagination: { total: number; page: number; pages: number };
      }>(`/api/v1/marketplace/browse?${params.toString()}`);

      if (!res.ok) {
        s.stop();
        ui.error(res.error || "Failed to load marketplace");
        process.exit(1);
      }

      const { modules, pagination } = res.data;
      s.stop(`SpokeStack Marketplace — ${pagination.total} modules`);

      if (opts.json) {
        ui.jsonOutput({ modules, pagination });
        return;
      }

      if (modules.length === 0) {
        ui.info(
          `No modules found. Be the first: ${ui.BOLD("spokestack module create")}`
        );
        return;
      }

      ui.table(
        [
          { key: "name", label: "Module", width: 24 },
          {
            key: "avgRating",
            label: "Rating",
            width: 8,
            format: (v) => renderStars(v as number),
          },
          {
            key: "installCount",
            label: "Installs",
            width: 10,
            align: "right" as const,
            format: (v) => String(v),
          },
          {
            key: "pricing",
            label: "Price",
            width: 12,
            format: (v) =>
              priceLabel(
                v as { type: string; priceCents?: number; monthlyPriceCents?: number }
              ),
          },
        ],
        modules
      );

      if (opts.yes) {
        ui.blank();
        return;
      }

      ui.blank();
      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "What would you like to do?",
          choices: [
            ...modules.slice(0, 5).map((m) => ({
              name: `Install: ${m.name}`,
              value: { type: "install", module: m },
            })),
            { name: "Search for a module", value: { type: "search" } },
            { name: "Exit", value: { type: "exit" } },
          ],
        },
      ]);

      if (action.type === "exit") return;

      if (action.type === "search") {
        const { query } = await inquirer.prompt([
          { type: "input", name: "query", message: "Search:" },
        ]);
        await doSearch(query, opts);
        return;
      }

      if (action.type === "install") {
        await doInstall(action.module.id, opts);
      }
    });

  // marketplace search <query>
  marketplace
    .command("search <query>")
    .description("Search the marketplace")
    .option("--json", "Output JSON")
    .action(async (query: string, opts) => {
      await doSearch(query, opts);
    });

  // marketplace install <moduleId>
  marketplace
    .command("install <moduleId>")
    .description("Install a module from the marketplace")
    .option("--yes", "Skip confirmation")
    .option("--json", "Output JSON")
    .action(async (moduleId: string, opts) => {
      await doInstall(moduleId, opts);
    });

  // marketplace info <moduleId>
  marketplace
    .command("info <moduleId>")
    .description("Show detailed module information")
    .option("--json", "Output JSON")
    .action(async (moduleId: string, opts) => {
      const res = await get<DetailModule>(
        `/api/v1/marketplace/${moduleId}`
      );

      if (!res.ok) {
        ui.error(res.error || "Module not found");
        process.exit(1);
      }

      const m = res.data;

      if (opts.json) {
        ui.jsonOutput(m);
        return;
      }

      ui.blank();
      ui.line(`  ${ui.BOLD(m.name)}  v${m.version}`);
      ui.line(`  ${m.shortDescription}`);
      ui.blank();
      ui.line(
        `  Category: ${m.category}${m.industry ? ` / ${m.industry}` : ""}`
      );
      ui.line(`  Installs: ${m.installCount}`);
      ui.line(
        `  Rating:   ${renderStars(m.avgRating)} ${m.avgRating.toFixed(1)}/5 (${m.reviewCount} reviews)`
      );
      ui.line(`  Pricing:  ${priceLabel(m.pricing)}`);
      ui.line(
        `  Status:   ${m.isInstalled ? ui.SUCCESS("INSTALLED") : ui.MUTED("Not installed")}`
      );

      if (Array.isArray(m.tools) && m.tools.length > 0) {
        ui.blank();
        ui.line(`  ${ui.BOLD("Tools:")} ${m.tools.length}`);
        for (const t of m.tools) {
          ui.line(
            `    ${ui.INFO(t.method.padEnd(6))} ${t.path}  ${ui.MUTED(t.name)}`
          );
        }
      }

      ui.blank();
      if (!m.isInstalled) {
        ui.line(
          `  Install: ${ui.BOLD(`spokestack marketplace install ${m.slug}`)}`
        );
      }
      ui.blank();
    });
}

// ── Shared Actions ─────────────────────────────────────────────────

async function doSearch(
  query: string,
  opts: { json?: boolean }
): Promise<void> {
  const s = ui.spinner(`Searching for "${query}"...`);

  const res = await get<{
    modules: BrowseModule[];
    pagination: { total: number };
  }>(`/api/v1/marketplace/browse?q=${encodeURIComponent(query)}&limit=10`);

  if (!res.ok) {
    s.stop();
    ui.error(res.error || "Search failed");
    process.exit(1);
  }

  const modules = res.data.modules;
  s.stop(`Found ${modules.length} results for "${query}"`);

  if (opts.json) {
    ui.jsonOutput(modules);
    return;
  }

  if (modules.length === 0) {
    ui.info(
      `No modules found. Build your own: ${ui.BOLD("spokestack module create")}`
    );
    return;
  }

  ui.table(
    [
      { key: "name", label: "Module", width: 24 },
      { key: "category", label: "Category", width: 14 },
      {
        key: "installCount",
        label: "Installs",
        width: 10,
        align: "right" as const,
        format: (v) => String(v),
      },
      {
        key: "avgRating",
        label: "Rating",
        width: 8,
        format: (v) => (v as number).toFixed(1),
      },
      {
        key: "pricing",
        label: "Price",
        width: 12,
        format: (v) =>
          priceLabel(
            v as { type: string; priceCents?: number; monthlyPriceCents?: number }
          ),
      },
    ],
    modules
  );

  ui.blank();
}

async function doInstall(
  moduleId: string,
  opts: { yes?: boolean; json?: boolean }
): Promise<void> {
  if (!opts.yes) {
    // Look up module details
    const s = ui.spinner("Loading module info...");
    const infoRes = await get<DetailModule>(
      `/api/v1/marketplace/${moduleId}`
    );
    s.stop();

    if (!infoRes.ok) {
      ui.error(infoRes.error || "Module not found");
      process.exit(1);
    }

    const m = infoRes.data;
    ui.blank();
    ui.line(`  ${ui.BOLD(m.name)}`);
    ui.line(`  ${m.shortDescription}`);
    ui.line(
      `  Tools: ${Array.isArray(m.tools) ? m.tools.length : "?"}`
    );
    ui.line(`  Price: ${priceLabel(m.pricing)}`);
    ui.blank();

    if (m.isInstalled) {
      ui.info("This module is already installed.");
      return;
    }

    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: `Install ${m.name}?`,
        default: true,
      },
    ]);
    if (!confirmed) return;

    // Use the actual ID for install
    moduleId = m.id;
  }

  const s2 = ui.spinner("Installing...");
  const installRes = await post<{ ok?: boolean; moduleType?: string; message?: string }>(
    "/api/v1/marketplace/install",
    {
      moduleId,
      acceptPricing: true,
    }
  );
  s2.stop();

  if (!installRes.ok) {
    ui.error("Install failed");
    const msg = installRes.error || "";
    if (msg.includes("UPGRADE_REQUIRED")) {
      ui.line(
        `  ${ui.MUTED("→")} This module requires a paid plan. Run: ${ui.BOLD("spokestack upgrade")}`
      );
    } else {
      ui.error(msg);
    }
    process.exit(1);
  }

  ui.success(installRes.data.message || `Installed ${moduleId}`);

  if (opts.json) {
    ui.jsonOutput(installRes.data);
  }

  ui.blank();
}
