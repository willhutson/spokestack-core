import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";
import { getModuleByType } from "@/lib/modules/registry";

/**
 * GET /api/v1/modules/installed
 * Returns all OrgModule records for the authenticated org where active = true,
 * joined with registry metadata.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const orgModules = await prisma.orgModule.findMany({
    where: {
      organizationId: auth.organizationId,
      active: true,
    },
    orderBy: { installedAt: "asc" },
  });

  const installed = orgModules.map((om) => {
    const meta = getModuleByType(om.moduleType);
    return {
      moduleType: om.moduleType,
      installedAt: om.installedAt.toISOString(),
      active: om.active,
      config: om.config,
      name: meta?.name ?? om.moduleType,
      description: meta?.description ?? "",
      category: meta?.category ?? "core",
      agentName: meta?.agentName ?? "",
      surfaces: meta?.surfaces ?? [],
    };
  });

  return json({ installed });
}
