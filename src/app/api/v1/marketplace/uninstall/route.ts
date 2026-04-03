import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { ModuleType } from "@prisma/client";

const CORE_MODULES: ModuleType[] = ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"];

/**
 * POST /api/v1/marketplace/uninstall
 * Uninstall a marketplace module for the organization.
 *
 * Body options:
 *   { moduleType }  — legacy internal uninstall
 *   { moduleId }    — marketplace published module uninstall
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can uninstall modules");
  }

  const body = await req.json();
  const { moduleType, moduleId } = body;

  // --- Marketplace published module uninstall ---
  if (moduleId) {
    const install = await prisma.moduleInstall.findUnique({
      where: {
        publishedModuleId_orgId: {
          publishedModuleId: moduleId,
          orgId: auth.organizationId,
        },
      },
    });

    if (!install || !install.isActive) {
      return error("Module is not installed", 404);
    }

    // Deactivate ModuleInstall
    await prisma.moduleInstall.update({
      where: { id: install.id },
      data: { isActive: false, uninstalledAt: new Date() },
    });

    // Decrement install count
    await prisma.publishedModule.update({
      where: { id: moduleId },
      data: { installCount: { decrement: 1 } },
    });

    // Also deactivate OrgModule if the published module maps to a ModuleType
    const publishedModule = await prisma.publishedModule.findUnique({
      where: { id: moduleId },
      select: { moduleType: true, name: true },
    });

    const validTypes = Object.values(ModuleType);
    if (
      publishedModule &&
      validTypes.includes(publishedModule.moduleType as ModuleType)
    ) {
      await prisma.orgModule
        .update({
          where: {
            organizationId_moduleType: {
              organizationId: auth.organizationId,
              moduleType: publishedModule.moduleType as ModuleType,
            },
          },
          data: { active: false },
        })
        .catch(() => {
          // OrgModule may not exist — that's fine
        });
    }

    // Record billing cancel event for subscription modules
    if (publishedModule) {
      const mod = await prisma.publishedModule.findUnique({
        where: { id: moduleId },
        select: { pricing: true },
      });
      const pricing = mod?.pricing as { type?: string } | null;
      if (pricing?.type === "subscription") {
        await prisma.moduleBillingEvent.create({
          data: {
            publishedModuleId: moduleId,
            orgId: auth.organizationId,
            type: "CANCEL",
            amountCents: 0,
            platformFeeCents: 0,
            publisherShareCents: 0,
          },
        });
      }
    }

    return json({
      ok: true,
      message: `${publishedModule?.name || "Module"} uninstalled`,
    });
  }

  // --- Legacy internal uninstall ---
  if (!moduleType) return error("moduleType or moduleId is required");

  if (CORE_MODULES.includes(moduleType)) {
    return error("Core modules cannot be uninstalled", 400);
  }

  const existing = await prisma.orgModule.findUnique({
    where: {
      organizationId_moduleType: {
        organizationId: auth.organizationId,
        moduleType,
      },
    },
  });

  if (!existing || !existing.active) {
    return error("Module is not installed", 404);
  }

  const orgModule = await prisma.orgModule.update({
    where: { id: existing.id },
    data: { active: false },
  });

  return json({ orgModule, message: `${moduleType} module uninstalled` });
}
