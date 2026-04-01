import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { proxyToProvider } from "@/lib/integrations/nango/connection";
import { getProvider } from "@/lib/integrations/nango/providers";

/**
 * POST /api/v1/integrations/proxy
 * Proxy an API call through Nango to an external provider.
 * Body: { provider: string, endpoint: string, method?: string, body?: unknown }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  let body: {
    provider?: string;
    endpoint?: string;
    method?: string;
    body?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  if (!body.provider || typeof body.provider !== "string") {
    return error("Missing required field: provider", 400);
  }

  if (!body.endpoint || typeof body.endpoint !== "string") {
    return error("Missing required field: endpoint", 400);
  }

  const provider = getProvider(body.provider);
  if (!provider) {
    return error(`Unknown provider: ${body.provider}`, 400);
  }

  const method = (
    (body.method ?? "GET").toUpperCase()
  ) as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  const allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  if (!allowedMethods.includes(method)) {
    return error(`Invalid method: ${body.method}`, 400);
  }

  try {
    const data = await proxyToProvider(
      auth.organizationId,
      body.provider,
      body.endpoint,
      method,
      body.body
    );
    return json({ data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Proxy request failed";
    const status = message.includes("No active connection") ? 404 : 500;
    return error(message, status);
  }
}
