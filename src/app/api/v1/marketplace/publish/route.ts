import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { validateModuleTools } from "@/lib/marketplace/security";
import { validateSystemPrompt } from "@/lib/marketplace/prompt-security";
import { enqueueModuleReview } from "@/lib/marketplace/enqueue-review";

/**
 * POST /api/v1/marketplace/publish
 * Submit a module for review. OWNER or ADMIN only.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only OWNER or ADMIN can publish modules");
  }

  const body = await req.json();
  const { manifest, tools, systemPrompt, uiTemplate, pricing, slug } = body;

  if (!manifest?.name || !tools || !systemPrompt || !pricing || !slug) {
    return error(
      "Missing required fields: manifest.name, tools, systemPrompt, pricing, slug"
    );
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return error("Slug must be lowercase letters, numbers, and hyphens only");
  }

  // Check slug uniqueness (allow same-org re-publish)
  const existing = await prisma.publishedModule.findUnique({
    where: { slug },
  });
  if (existing && existing.publisherOrgId !== auth.organizationId) {
    return error("This slug is already taken", 409);
  }

  // Validate tools security
  const securityReport = validateModuleTools(tools);
  if (!securityReport.passed) {
    return json(
      {
        error: "Module failed security validation",
        blockers: securityReport.blockers,
        warnings: securityReport.warnings,
      },
      422
    );
  }

  // Validate system prompt
  const promptReport = validateSystemPrompt(systemPrompt);
  if (!promptReport.passed) {
    return json(
      {
        error: "System prompt failed validation",
        details: promptReport,
      },
      422
    );
  }

  // Validate pricing shape
  if (!["free", "paid", "subscription"].includes(pricing.type)) {
    return error("pricing.type must be free, paid, or subscription");
  }
  if (pricing.type === "paid" && !pricing.priceCents) {
    return error("pricing.priceCents required for paid modules");
  }
  if (pricing.type === "subscription" && !pricing.monthlyPriceCents) {
    return error("pricing.monthlyPriceCents required for subscription modules");
  }

  const newVersion = existing
    ? incrementVersion(existing.version)
    : "1.0.0";

  const mod = await prisma.publishedModule.upsert({
    where: { slug },
    create: {
      publisherOrgId: auth.organizationId,
      name: manifest.name,
      slug,
      description: manifest.description || "",
      shortDescription:
        manifest.shortDescription || manifest.description?.slice(0, 120) || "",
      category: manifest.category || "General",
      industry: manifest.industry || null,
      moduleType:
        manifest.moduleType || slug.toUpperCase().replace(/-/g, "_"),
      manifest,
      tools,
      systemPrompt,
      uiTemplate: uiTemplate || null,
      pricing,
      status: "PENDING_REVIEW",
      version: "1.0.0",
      securityScore: securityReport.score,
    },
    update: {
      manifest,
      tools,
      systemPrompt,
      uiTemplate: uiTemplate || null,
      pricing,
      status: "PENDING_REVIEW",
      version: newVersion,
      securityScore: securityReport.score,
      name: manifest.name,
      description: manifest.description || "",
      shortDescription:
        manifest.shortDescription || manifest.description?.slice(0, 120) || "",
    },
  });

  // Fire-and-forget automated review
  void enqueueModuleReview(mod.id, auth.organizationId);

  return json(
    {
      ok: true,
      moduleId: mod.id,
      slug: mod.slug,
      status: mod.status,
      version: mod.version,
      securityScore: securityReport.score,
      warnings: securityReport.warnings,
      message:
        "Module submitted for review. You will be notified when the review is complete.",
    },
    201
  );
}

function incrementVersion(version: string): string {
  const parts = version.split(".").map(Number);
  return `${parts[0]}.${(parts[1] || 0) + 1}.0`;
}
