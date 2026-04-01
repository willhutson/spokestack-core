import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/integrations/nango/providers";
import { disconnectProvider } from "@/lib/integrations/nango/connection";

interface RouteContext {
  params: Promise<{ provider: string }>;
}

/**
 * GET /api/v1/integrations/[provider]
 * Get the connection status for a specific provider.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { provider: providerId } = await context.params;
  const providerMeta = getProvider(providerId);

  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: auth.organizationId,
        provider: providerId,
      },
    },
  });

  if (!integration) {
    return json({
      provider: providerId,
      displayName: providerMeta?.displayName ?? providerId,
      module: providerMeta?.module ?? null,
      status: "not_connected",
    });
  }

  return json({
    id: integration.id,
    provider: integration.provider,
    displayName: providerMeta?.displayName ?? providerId,
    module: providerMeta?.module ?? integration.moduleType,
    status: integration.status,
    lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
    syncError: integration.syncError,
    installedAt: integration.installedAt.toISOString(),
  });
}

/**
 * DELETE /api/v1/integrations/[provider]
 * Disconnect (soft-delete) the integration for a provider.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { provider: providerId } = await context.params;

  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_provider: {
        organizationId: auth.organizationId,
        provider: providerId,
      },
    },
  });

  if (!integration) {
    return error(`No connection found for provider: ${providerId}`, 404);
  }

  try {
    await disconnectProvider(auth.organizationId, providerId);
    return json({ success: true, provider: providerId, status: "DISABLED" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to disconnect";
    return error(message, 500);
  }
}
