import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { ModuleType } from "@prisma/client";

const CORE_MODULES: ModuleType[] = ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"];

/**
 * POST /api/v1/marketplace/uninstall
 * Uninstall a marketplace module for the organization.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can uninstall modules");
  }

  const body = await req.json();
  const { moduleType } = body;

  if (!moduleType) return error("moduleType is required");

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
