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
  const authHeader = req.headers.get("authorization");
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
