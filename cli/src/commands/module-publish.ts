import * as fs from "node:fs";
import * as path from "node:path";
import inquirer from "inquirer";
import { post } from "../api.js";
import * as ui from "../ui.js";

interface PublishOpts {
  price?: string;
  monthlyPrice?: string;
  yes?: boolean;
  json?: boolean;
}

export async function modulePublishCommand(
  slugOrPath: string,
  opts: PublishOpts
): Promise<void> {
  ui.heading("Publish to Marketplace");

  // Load module package
  const modulesDir = path.join(process.cwd(), "modules");
  const packagePath = path.join(modulesDir, slugOrPath, "module-package.json");

  if (!fs.existsSync(packagePath)) {
    ui.error(`Module package not found: ${packagePath}`);
    ui.line(
      `  ${ui.MUTED("Hint:")} Run ${ui.BOLD(`spokestack module create ${slugOrPath}`)} first`
    );
    process.exit(1);
  }

  const modulePackage = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

  // Handle --price and --monthly-price overrides
  if (opts.price) {
    const priceCents = parseInt(opts.price, 10);
    if (isNaN(priceCents) || priceCents < 100) {
      ui.error(
        "--price must be a number in cents >= 100 (e.g. --price 1000 = AED 10)"
      );
      process.exit(1);
    }
    modulePackage.pricing = { type: "paid", priceCents };
  }

  if (opts.monthlyPrice) {
    const monthlyCents = parseInt(opts.monthlyPrice, 10);
    if (isNaN(monthlyCents) || monthlyCents < 100) {
      ui.error(
        "--monthly-price must be a number in cents >= 100 (e.g. --monthly-price 1500 = AED 15/mo)"
      );
      process.exit(1);
    }
    modulePackage.pricing = { type: "subscription", monthlyPriceCents: monthlyCents };
  }

  const manifest = modulePackage.manifest;
  const pricing = modulePackage.pricing;

  const pricingLabel =
    pricing.type === "free"
      ? "Free"
      : pricing.type === "paid"
        ? `${ui.formatCurrency(pricing.priceCents, "AED")} one-time`
        : `${ui.formatCurrency(pricing.monthlyPriceCents, "AED")}/month`;

  ui.line(`  Module:   ${ui.BOLD(manifest.name)}`);
  ui.line(`  Slug:     ${manifest.slug}`);
  ui.line(`  Category: ${manifest.category}`);
  ui.line(`  Tools:    ${modulePackage.tools.length}`);
  ui.line(`  Pricing:  ${pricingLabel}`);
  ui.blank();

  // Confirm
  if (!opts.yes) {
    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: "Publish to SpokeStack Marketplace?",
        default: false,
      },
    ]);
    if (!confirmed) {
      ui.info("Publish cancelled");
      return;
    }
  }

  // Publish
  const s = ui.spinner("Submitting to marketplace...");

  const result = await post<{
    ok?: boolean;
    moduleId?: string;
    slug?: string;
    status?: string;
    version?: string;
    securityScore?: number;
    warnings?: Array<{ message: string; tool?: string; field?: string }>;
    error?: string;
    blockers?: Array<{ message: string; tool?: string; field?: string }>;
  }>("/api/v1/marketplace/publish", {
    manifest: modulePackage.manifest,
    tools: modulePackage.tools,
    systemPrompt: modulePackage.systemPrompt,
    uiTemplate: modulePackage.uiTemplate,
    pricing: modulePackage.pricing,
    slug: manifest.slug,
  });

  s.stop();

  if (!result.ok) {
    ui.error("Publish failed");
    const data = result.data;
    if (data?.blockers && data.blockers.length > 0) {
      ui.line(`  Security blockers found:`);
      for (const b of data.blockers) {
        ui.line(`  ${ui.ERROR_COLOR("✗")} [${b.tool || b.field}] ${b.message}`);
      }
      ui.blank();
      ui.line(
        `  ${ui.MUTED("Hint:")} Run ${ui.BOLD("spokestack module test")} to fix issues`
      );
    } else {
      ui.error(data?.error || result.error || "Unknown error");
    }
    process.exit(1);
  }

  const data = result.data;

  if (opts.json) {
    ui.jsonOutput(data);
    return;
  }

  // Show security score
  if (data.securityScore && data.securityScore >= 9) {
    ui.success(`Security review passed (score: ${data.securityScore}/10)`);
  } else if (data.securityScore) {
    ui.warn(
      `Security score: ${data.securityScore}/10 — manual review queued`
    );
  }

  // Show warnings
  if (data.warnings && data.warnings.length > 0) {
    for (const w of data.warnings) {
      ui.warn(`  ⚠ ${w.message}`);
    }
  }

  ui.blank();
  ui.success(`Published! Status: ${data.status}`);
  ui.line(`  Module ID:       ${data.moduleId}`);
  ui.line(`  Version:         ${data.version}`);
  ui.blank();
  ui.line("  Track installs and revenue:");
  ui.line(
    `    ${ui.BOLD(`spokestack module analytics ${slugOrPath}`)}`
  );
  ui.blank();
}
