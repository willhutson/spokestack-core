import registryData from "./registry.json";

interface ModuleManifest {
  moduleType: string;
  name: string;
  description: string;
  category: string;
  minTier: string;
  price: number | null;
  agentName: string;
  agentType: string | null;
  iconName: string;
  href: string;
  surfaces: string[];
  tools?: Array<{
    name: string;
    description: string;
    method: string;
    path: string;
    parameters?: Record<string, unknown>;
    fixedBody?: Record<string, unknown>;
  }>;
}

const registry = registryData as ModuleManifest[];
const registryMap = new Map(registry.map((m) => [m.moduleType, m]));

/**
 * Get the full module manifest for a given moduleType.
 * Returns null if the moduleType is not in the registry.
 */
export function getModuleManifest(
  moduleType: string
): ModuleManifest | null {
  return registryMap.get(moduleType) ?? null;
}
