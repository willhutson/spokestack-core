import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { emitEvent } from "@/lib/events/emitter";
import { getProvider } from "@/lib/integrations/nango/providers";
import { initiateConnection } from "@/lib/integrations/nango/connection";

/**
 * POST /api/v1/integrations/connect
 * Start an OAuth connection flow for a provider.
 * Body: { provider: string }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  let body: { provider?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const providerId = body.provider;
  if (!providerId || typeof providerId !== "string") {
    return error("Missing required field: provider", 400);
  }

  const provider = getProvider(providerId);
  if (!provider) {
    return error(`Unknown provider: ${providerId}`, 400);
  }

  try {
    const result = await initiateConnection(auth.organizationId, providerId);

    emitEvent(auth.organizationId, "Integration", result.integration.id, "connected", { provider: providerId }, auth.user.id).catch(() => {});

    return json({
      authUrl: result.authUrl,
      integrationId: result.integration.id,
      provider: providerId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return error(message, 500);
  }
}
