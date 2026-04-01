import { NextRequest } from "next/server";
import { json } from "@/lib/api";
import { getAvailableModules } from "@/lib/modules/registry";

/**
 * GET /api/v1/modules
 * Returns the full list of available modules from the static registry.
 * Public or org-authenticated — no auth required for browsing.
 */
export async function GET(_req: NextRequest) {
  const modules = getAvailableModules().map((m) => ({
    moduleType: m.moduleType,
    name: m.name,
    description: m.description,
    category: m.category,
    minTier: m.minTier,
    price: m.price,
    agentName: m.agentName,
    surfaces: m.surfaces,
  }));

  return json({ modules });
}
