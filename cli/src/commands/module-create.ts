import * as fs from "node:fs";
import * as path from "node:path";
import inquirer from "inquirer";
import { post } from "../api.js";
import * as ui from "../ui.js";

interface ScaffoldField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ModulePackage {
  manifest: {
    name: string;
    slug: string;
    moduleType: string;
    category: string;
    description: string;
    shortDescription: string;
    industry?: string;
  };
  tools: Array<{ name: string; method: string; path: string; description: string }>;
  systemPrompt: string;
  pricing: { type: string; priceCents?: number; monthlyPriceCents?: number };
  uiTemplate?: string;
}

interface CreateOpts {
  name?: string;
  slug?: string;
  type?: string;
  entity?: string;
  entities?: string;
  category?: string;
  industry?: string;
  output?: string;
  yes?: boolean;
  json?: boolean;
}

export async function moduleCreateCommand(
  nameArg: string | undefined,
  opts: CreateOpts
): Promise<void> {
  ui.heading("Module Builder");

  let name: string;
  let slug: string;
  let moduleType: string;
  let entityName: string;
  let entityPlural: string;
  let fields: ScaffoldField[];
  let category: string;
  let industry: string | undefined;
  let pricingType: string;

  if (opts.yes) {
    // Non-interactive mode
    name = opts.name || nameArg || "";
    slug = opts.slug || "";
    moduleType = opts.type || "";
    entityName = opts.entity || "";
    category = opts.category || "Operations";
    industry = opts.industry;
    pricingType = "free";

    if (!name || !slug || !moduleType || !entityName) {
      ui.error(
        "Non-interactive mode requires: --name, --slug, --type, --entity"
      );
      process.exit(1);
    }

    entityPlural = `${entityName}s`;
    const fieldNames = opts.entities
      ? opts.entities.split(",").map((s) => s.trim())
      : [];
    fields = fieldNames.map((n) => ({
      name: n,
      type: "string",
      required: false,
      description: "",
    }));
  } else {
    // Interactive mode
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "What does your module do?",
        default: nameArg,
        validate: (v: string) =>
          v.length >= 3 || "Please enter at least 3 characters",
      },
      {
        type: "input",
        name: "entityName",
        message:
          "What is the main thing it manages? (singular, e.g. property, patient, ticket)",
        validate: (v: string) =>
          /^[a-z][a-z_]*$/.test(v) || "Use lowercase letters only",
      },
      {
        type: "input",
        name: "entityPlural",
        message: "Plural form:",
        default: (a: { entityName: string }) => `${a.entityName}s`,
      },
      {
        type: "input",
        name: "fields",
        message:
          "What fields does it track? (comma-separated, e.g. address,price,status,notes)",
        default: "name,status,notes",
      },
      {
        type: "list",
        name: "category",
        message: "Category:",
        choices: [
          "Operations",
          "Sales",
          "HR",
          "Finance",
          "Marketing",
          "Legal",
          "Custom",
        ],
        default: "Operations",
      },
      {
        type: "input",
        name: "industry",
        message: "Industry (optional, e.g. Real Estate, Healthcare):",
      },
      {
        type: "list",
        name: "pricingType",
        message: "Pricing model:",
        choices: [
          { name: "Free", value: "free" },
          { name: "One-time purchase", value: "paid" },
          { name: "Monthly subscription", value: "subscription" },
        ],
        default: "free",
      },
    ]);

    name = answers.name;
    entityName = answers.entityName;
    entityPlural = answers.entityPlural;
    category = answers.category;
    industry = answers.industry || undefined;
    pricingType = answers.pricingType;
    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    moduleType = entityName.toUpperCase().replace(/-/g, "_");
    const fieldNames = answers.fields
      .split(",")
      .map((s: string) => s.trim().toLowerCase());
    fields = fieldNames.map((n: string) => ({
      name: n,
      type: "string",
      required: false,
      description: "",
    }));
  }

  // Call agent builder to scaffold
  const s = ui.spinner("Scaffolding module...");

  let modulePackage: ModulePackage;

  const agentRes = await post<{ content?: string; module_package?: ModulePackage }>(
    "/api/v1/agents/ask",
    {
      agent_type: "module-builder-assistant",
      task: `Scaffold a new module called "${name}" that manages ${entityPlural}. Entity: ${entityName}. Fields: ${fields.map((f) => f.name).join(", ")}. Category: ${category}.${industry ? ` Industry: ${industry}.` : ""} Generate CRUD tools (list, create, get, update, delete) for the ${entityName} entity using /api/v1/context endpoints with category="${entityName}".`,
      stream: false,
    }
  );

  if (!agentRes.ok || !agentRes.data) {
    // Fallback: generate locally
    modulePackage = generateLocalPackage(
      name,
      slug,
      moduleType,
      entityName,
      entityPlural,
      fields,
      category,
      industry,
      pricingType
    );
  } else {
    modulePackage =
      agentRes.data.module_package ||
      generateLocalPackage(
        name,
        slug,
        moduleType,
        entityName,
        entityPlural,
        fields,
        category,
        industry,
        pricingType
      );
  }

  s.stop("Module scaffolded");

  // Write to disk
  const outputDir =
    opts.output || path.join(process.cwd(), "modules", slug);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(modulePackage.manifest, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, "agent.json"),
    JSON.stringify(
      {
        tools: modulePackage.tools,
        systemPrompt: modulePackage.systemPrompt,
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(outputDir, "pricing.json"),
    JSON.stringify(modulePackage.pricing, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, "module-package.json"),
    JSON.stringify(modulePackage, null, 2)
  );

  if (opts.json) {
    ui.jsonOutput(modulePackage);
    return;
  }

  ui.blank();
  ui.line(`  Manifest:  ${path.join(outputDir, "manifest.json")}`);
  ui.line(`  Tools:     ${modulePackage.tools.length} tools defined`);
  ui.line(
    `  Agent:     system prompt generated (${modulePackage.systemPrompt.length} chars)`
  );
  ui.line(`  Pricing:   ${modulePackage.pricing.type}`);
  ui.blank();
  ui.line(
    `  Next: ${ui.BOLD(`spokestack module test ${slug}`)}`
  );
  ui.blank();
}

/**
 * Generate a module package locally when the agent builder is unavailable.
 */
function generateLocalPackage(
  name: string,
  slug: string,
  moduleType: string,
  entityName: string,
  entityPlural: string,
  fields: ScaffoldField[],
  category: string,
  industry: string | undefined,
  pricingType: string
): ModulePackage {
  const fieldsList = fields.map((f) => f.name).join(", ");

  return {
    manifest: {
      name,
      slug,
      moduleType,
      category,
      description: `Manage ${entityPlural} with full CRUD operations. Tracks: ${fieldsList}.`,
      shortDescription: `${name} — manage ${entityPlural} for your organization.`,
      ...(industry && { industry }),
    },
    tools: [
      {
        name: `list_${entityPlural}`,
        method: "GET",
        path: `/api/v1/context?category=${entityName}`,
        description: `List all ${entityPlural} for the organization.`,
      },
      {
        name: `create_${entityName}`,
        method: "POST",
        path: "/api/v1/context",
        description: `Create a new ${entityName}. Fields: ${fieldsList}.`,
      },
      {
        name: `get_${entityName}`,
        method: "GET",
        path: `/api/v1/context?category=${entityName}&key=\${key}`,
        description: `Get a specific ${entityName} by key.`,
      },
      {
        name: `update_${entityName}`,
        method: "POST",
        path: "/api/v1/context",
        description: `Update an existing ${entityName}. Upserts by category + key.`,
      },
      {
        name: `delete_${entityName}`,
        method: "DELETE",
        path: `/api/v1/context/\${id}`,
        description: `Delete a ${entityName} by ID.`,
      },
    ],
    systemPrompt: `You are the ${name} assistant. You help users manage ${entityPlural} for their organization. You can list, create, update, and delete ${entityPlural}. Each ${entityName} has these fields: ${fieldsList}. Always confirm before deleting. Use clear, professional language. Format currency in AED when applicable.`,
    pricing: { type: pricingType },
  };
}
