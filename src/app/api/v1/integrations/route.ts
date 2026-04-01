import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";
import { getOrgConnections } from "@/lib/integrations/nango/connection";

/**
 * GET /api/v1/integrations
 * List all integration connections for the authenticated org,
 * enriched with provider metadata.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const connections = await getOrgConnections(auth.organizationId);
  return json({ connections });
}
