import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/members
 * List members of the authenticated user's organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | null;

  const members = await prisma.teamMember.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(role ? { role } : {}),
    },
    include: { user: true, team: true },
    orderBy: { joinedAt: "desc" },
  });

  return json({ members });
}

/**
 * POST /api/v1/members
 * Invite a new member to the organization.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can invite members");
  }

  const body = await req.json();
  const { email, role } = body;

  if (!email) return error("email is required");

  // Find or validate user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return error("User not found. They must sign up first.", 404);

  // Check if already a member
  const existing = await prisma.teamMember.findFirst({
    where: { userId: user.id, organizationId: auth.organizationId },
  });
  if (existing) return error("User is already a member of this organization", 409);

  const member = await prisma.teamMember.create({
    data: {
      organizationId: auth.organizationId,
      userId: user.id,
      role: role ?? "MEMBER",
    },
    include: { user: true },
  });

  return json({ member }, 201);
}
