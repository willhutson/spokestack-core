import { prisma } from "@/lib/prisma";
import { getProvider, getAllProviders } from "./providers";
import {
  isNangoConfigured,
  createConnection,
  deleteConnection as nangoDeleteConnection,
  proxyRequest,
} from "./client";
import type { NangoConnection } from "./types";
import type { ModuleType } from "@prisma/client";

/**
 * Initiate an OAuth connection for an organization to a provider.
 * Creates a pending Integration record and returns an auth URL
 * (real Nango URL if configured, placeholder otherwise).
 */
export async function initiateConnection(
  organizationId: string,
  providerId: string
): Promise<{ authUrl: string; integration: { id: string } }> {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  // Upsert the Integration record
  const integration = await prisma.integration.upsert({
    where: {
      organizationId_provider: { organizationId, provider: providerId },
    },
    update: { status: "PENDING", syncError: null },
    create: {
      organizationId,
      provider: providerId,
      status: "PENDING",
      moduleType: isValidModuleType(provider.module)
        ? (provider.module as ModuleType)
        : null,
    },
  });

  let authUrl: string;

  if (isNangoConfigured()) {
    const session = await createConnection({
      providerConfigKey: providerId,
      organizationId,
      connectionId: organizationId,
    });
    authUrl = `https://connect.nango.dev/sessions/${session.data.token}`;
  } else {
    authUrl = `https://connect.nango.dev/placeholder?provider=${providerId}&org=${organizationId}`;
  }

  return { authUrl, integration: { id: integration.id } };
}

/**
 * Get all Integration records for an organization, enriched with provider metadata.
 */
export async function getOrgConnections(
  organizationId: string
): Promise<NangoConnection[]> {
  const integrations = await prisma.integration.findMany({
    where: { organizationId },
    orderBy: { installedAt: "desc" },
  });

  return integrations.map((int) => {
    const provider = getProvider(int.provider);
    return {
      id: int.id,
      provider: int.provider,
      organizationId: int.organizationId,
      status: mapStatus(int.status),
      lastSyncAt: int.lastSyncAt?.toISOString(),
      metadata: {
        displayName: provider?.displayName ?? int.provider,
        module: provider?.module ?? int.moduleType,
        scopes: provider?.scopes ?? [],
        nangoConnectionId: int.nangoConnectionId,
        config: int.config,
        syncError: int.syncError,
      },
    };
  });
}

/**
 * Soft-delete (disable) a provider connection for an organization.
 */
export async function disconnectProvider(
  organizationId: string,
  providerId: string
): Promise<void> {
  await prisma.integration.update({
    where: {
      organizationId_provider: { organizationId, provider: providerId },
    },
    data: { status: "DISABLED" },
  });

  // Best-effort cleanup on Nango side
  if (isNangoConfigured()) {
    try {
      await nangoDeleteConnection(providerId, organizationId);
    } catch {
      // Nango connection may not exist; ignore
    }
  }
}

/**
 * Proxy an API call through Nango for a specific org + provider.
 * Looks up the active connection then forwards through the Nango proxy.
 */
export async function proxyToProvider(
  organizationId: string,
  providerId: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown
) {
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: { organizationId, provider: providerId },
    },
  });

  if (!integration || integration.status !== "ACTIVE") {
    throw new Error(
      `No active connection for provider ${providerId} in this organization`
    );
  }

  if (!isNangoConfigured()) {
    throw new Error("Nango is not configured — set NANGO_SECRET_KEY");
  }

  const connectionId = integration.nangoConnectionId ?? organizationId;

  const response = await proxyRequest(
    connectionId,
    providerId,
    endpoint,
    method,
    body
  );

  return response.data;
}

// ---- helpers ----

const VALID_MODULE_TYPES = new Set(
  getAllProviders()
    .map((p) => p.module)
    .filter((m) => {
      // Only include values that exist in ModuleType enum
      return [
        "TASKS",
        "PROJECTS",
        "BRIEFS",
        "ORDERS",
        "CRM",
        "SOCIAL_PUBLISHING",
        "CONTENT_STUDIO",
        "ANALYTICS",
        "SURVEYS",
        "LISTENING",
        "MEDIA_BUYING",
        "LMS",
        "NPS",
        "TIME_LEAVE",
        "BOARDS",
        "FINANCE",
        "WORKFLOWS",
        "CLIENT_PORTAL",
        "SPOKECHAT",
        "DELEGATION",
        "ACCESS_CONTROL",
        "API_MANAGEMENT",
        "BUILDER",
      ].includes(m);
    })
);

function isValidModuleType(module: string): boolean {
  return VALID_MODULE_TYPES.has(module);
}

function mapStatus(
  status: string
): "connected" | "pending" | "error" {
  switch (status) {
    case "ACTIVE":
      return "connected";
    case "PENDING":
      return "pending";
    default:
      return "error";
  }
}
