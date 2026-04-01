import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { ModuleType } from "@prisma/client";
import { installModule, type InstallResult } from "@/lib/modules/installer";

/**
 * POST /api/v1/modules/install-batch
 * Install multiple modules in one call.
 * Skips any the tier can't install.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { moduleTypes } = body as { moduleTypes?: string[] };

  if (!moduleTypes || !Array.isArray(moduleTypes) || moduleTypes.length === 0) {
    return error("moduleTypes array is required");
  }

  // Validate all types
  const validTypes = Object.values(ModuleType);
  const invalid = moduleTypes.filter(
    (mt) => !validTypes.includes(mt as ModuleType)
  );
  if (invalid.length > 0) {
    return error(`Invalid moduleTypes: ${invalid.join(", ")}`);
  }

  // Get org tier
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: auth.organizationId },
    select: { tier: true },
  });
  const tier = billing?.tier ?? "FREE";

  // Install each module
  const installed: InstallResult[] = [];
  const skipped: InstallResult[] = [];
  const errors: InstallResult[] = [];

  for (const mtStr of moduleTypes) {
    const mt = mtStr as ModuleType;
    const result = await installModule(auth.organizationId, mt, tier);

    if (result.success) {
      installed.push(result);
    } else if (result.requiredTier) {
      skipped.push(result);
    } else {
      errors.push(result);
    }
  }

  return json({ installed, skipped, errors });
}
