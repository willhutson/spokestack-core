import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { ModuleType } from "@prisma/client";

interface Params {
  params: Promise<{ moduleType: string }>;
}

/**
 * DELETE /api/v1/modules/:moduleType/uninstall
 * Soft-uninstalls a module: sets OrgModule.active = false.
 * Does NOT delete data.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { moduleType } = await params;

  const validTypes = Object.values(ModuleType);
  if (!validTypes.includes(moduleType as ModuleType)) {
    return error(`Invalid moduleType: ${moduleType}`);
  }

  const mt = moduleType as ModuleType;

  const existing = await prisma.orgModule.findUnique({
    where: {
      organizationId_moduleType: {
        organizationId: auth.organizationId,
        moduleType: mt,
      },
    },
  });

  if (!existing) {
    return error(`Module ${moduleType} is not installed`, 404);
  }

  await prisma.orgModule.update({
    where: { id: existing.id },
    data: { active: false },
  });

  // Notify agent-builder to deregister (non-blocking)
  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const runtimeSecret = process.env.AGENT_RUNTIME_SECRET;
  if (runtimeUrl) {
    try {
      await fetch(
        `${runtimeUrl}/api/v1/core/modules/${auth.organizationId}/${mt}/deregister`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(runtimeSecret ? { "X-Agent-Secret": runtimeSecret } : {}),
          },
        }
      );
    } catch {
      // Non-blocking
    }
  }

  return json({ success: true, moduleType: mt });
}
