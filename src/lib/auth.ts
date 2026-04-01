import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase/server";

export interface AuthContext {
  user: { id: string; email: string; supabaseId: string };
  organizationId: string;
  role: string;
}

/**
 * Authenticate a request and resolve the user + organization context.
 * Returns null if authentication fails.
 */
export async function authenticate(
  req: NextRequest
): Promise<AuthContext | null> {
  // Path 1: Bearer token (user auth via Supabase)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const supabaseUser = await getAuthUser(authHeader);
    if (!supabaseUser) return null;

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      include: {
        memberships: {
          include: { organization: true },
          take: 1,
          orderBy: { joinedAt: "desc" },
        },
      },
    });

    if (!user || user.memberships.length === 0) return null;

    // Use orgId from header if provided, otherwise default to most recent
    const requestedOrgId = req.headers.get("x-organization-id");
    const membership = requestedOrgId
      ? user.memberships.find((m) => m.organizationId === requestedOrgId)
      : user.memberships[0];

    if (!membership) return null;

    return {
      user: { id: user.id, email: user.email, supabaseId: user.supabaseId },
      organizationId: membership.organizationId,
      role: membership.role,
    };
  }

  // Path 2: Service-to-service auth (agent-builder)
  const agentSecret = req.headers.get("x-agent-secret");
  const orgId = req.headers.get("x-org-id");

  if (agentSecret && orgId) {
    const expectedSecret = process.env.AGENT_RUNTIME_SECRET;
    if (!expectedSecret || agentSecret !== expectedSecret) return null;

    // Verify the org exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });
    if (!org) return null;

    return {
      user: { id: "system", email: "agent@spokestack.internal", supabaseId: "system" },
      organizationId: orgId,
      role: "ADMIN",
    };
  }

  return null;
}
