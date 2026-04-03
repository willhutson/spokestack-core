import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { validateModuleTools } from "@/lib/marketplace/security";
import { enqueueModuleReview } from "@/lib/marketplace/enqueue-review";

/**
 * GET /api/v1/marketplace/[moduleId]
 * Module detail — find by ID or slug. Includes install status for the caller.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { moduleId } = await params;

  const mod = await prisma.publishedModule.findFirst({
    where: {
      OR: [{ id: moduleId }, { slug: moduleId }],
      status: "PUBLISHED",
    },
  });

  if (!mod) return error("Not found", 404);

  const install = await prisma.moduleInstall.findUnique({
    where: {
      publishedModuleId_orgId: {
        publishedModuleId: mod.id,
        orgId: auth.organizationId,
      },
    },
  });

  return json({
    ...mod,
    isInstalled: !!install && install.isActive,
    installedVersion: install?.version || null,
  });
}

/**
 * PATCH /api/v1/marketplace/[moduleId]
 * Update a published module. Publisher only. Re-enters review pipeline.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { moduleId } = await params;

  const mod = await prisma.publishedModule.findUnique({
    where: { id: moduleId },
  });
  if (!mod) return error("Not found", 404);
  if (mod.publisherOrgId !== auth.organizationId) {
    return forbidden("Only the publisher can update this module");
  }

  const body = await req.json();
  const { tools, systemPrompt, uiTemplate, pricing, manifest } = body;

  // Validate tools if provided
  if (tools) {
    const report = validateModuleTools(tools);
    if (!report.passed) {
      return json(
        { error: "Security validation failed", blockers: report.blockers },
        422
      );
    }
  }

  const [major, minor] = mod.version.split(".").map(Number);
  const newVersion = `${major}.${(minor || 0) + 1}.0`;

  const updated = await prisma.publishedModule.update({
    where: { id: moduleId },
    data: {
      ...(tools && { tools }),
      ...(systemPrompt && { systemPrompt }),
      ...(uiTemplate !== undefined && { uiTemplate }),
      ...(pricing && { pricing }),
      ...(manifest && {
        manifest,
        name: manifest.name,
        description: manifest.description,
      }),
      version: newVersion,
      status: "PENDING_REVIEW",
    },
  });

  void enqueueModuleReview(updated.id, auth.organizationId);

  return json({ ok: true, version: newVersion, status: updated.status });
}

/**
 * DELETE /api/v1/marketplace/[moduleId]
 * Deprecate a module. Existing installs continue to work.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { moduleId } = await params;

  const mod = await prisma.publishedModule.findUnique({
    where: { id: moduleId },
  });
  if (!mod) return error("Not found", 404);
  if (mod.publisherOrgId !== auth.organizationId) {
    return forbidden("Only the publisher can deprecate this module");
  }

  await prisma.publishedModule.update({
    where: { id: moduleId },
    data: { status: "DEPRECATED" },
  });

  return json({
    ok: true,
    message: "Module deprecated. Existing installs continue to function.",
  });
}
