import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { ModuleType } from "@prisma/client";
import { getModuleByType, tierCanInstall } from "@/lib/modules/registry";

/**
 * POST /api/v1/modules/install
 * Orchestrates full module install:
 *   1. Validate org tier can install the module
 *   2. Upsert OrgModule record
 *   3. POST to agent-builder to register module agent
 *   4. Return success
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { moduleType } = body as { moduleType?: string };

  if (!moduleType) {
    return error("moduleType is required");
  }

  // Validate moduleType is a valid enum value
  const validTypes = Object.values(ModuleType);
  if (!validTypes.includes(moduleType as ModuleType)) {
    return error(`Invalid moduleType: ${moduleType}. Valid types: ${validTypes.join(", ")}`);
  }

  const mt = moduleType as ModuleType;
  const registryEntry = getModuleByType(mt);
  if (!registryEntry) {
    return error(`Module ${moduleType} not found in registry`);
  }

  // Check if already installed and active
  const existing = await prisma.orgModule.findUnique({
    where: {
      organizationId_moduleType: {
        organizationId: auth.organizationId,
        moduleType: mt,
      },
    },
  });

  if (existing?.active) {
    return error(`Module ${registryEntry.name} is already installed`, 400);
  }

  // Check tier eligibility
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: auth.organizationId },
    select: { tier: true },
  });

  const tier = billing?.tier ?? "FREE";
  if (!tierCanInstall(tier, mt)) {
    return json(
      {
        error: `Your ${tier} plan does not support the ${registryEntry.name} module. Minimum tier: ${registryEntry.minTier}.`,
        requiredTier: registryEntry.minTier,
      },
      402
    );
  }

  // Upsert OrgModule (handles reactivation of previously uninstalled modules)
  const orgModule = await prisma.orgModule.upsert({
    where: {
      organizationId_moduleType: {
        organizationId: auth.organizationId,
        moduleType: mt,
      },
    },
    update: { active: true },
    create: {
      organizationId: auth.organizationId,
      moduleType: mt,
      active: true,
    },
  });

  // Register with agent-builder (non-blocking — don't fail install if this fails)
  let agentRegistered = false;
  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const runtimeSecret = process.env.AGENT_RUNTIME_SECRET;
  if (runtimeUrl) {
    try {
      const res = await fetch(
        `${runtimeUrl}/api/v1/core/modules/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(runtimeSecret ? { "X-Agent-Secret": runtimeSecret } : {}),
          },
          body: JSON.stringify({
            org_id: auth.organizationId,
            module_type: mt,
            agent_definition: {
              name: registryEntry.agentName,
              description: registryEntry.description,
            },
          }),
        }
      );
      agentRegistered = res.ok;
    } catch {
      // Agent-builder unreachable — OrgModule is still created
      agentRegistered = false;
    }
  }

  return json({
    success: true,
    orgModule: {
      id: orgModule.id,
      moduleType: orgModule.moduleType,
      installedAt: orgModule.installedAt.toISOString(),
      active: orgModule.active,
    },
    agentRegistered,
  });
}
