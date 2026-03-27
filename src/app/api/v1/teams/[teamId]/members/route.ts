import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ teamId: string }>;
}

/**
 * GET /api/v1/teams/:teamId/members
 * List members of a team.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { teamId } = await params;

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: auth.organizationId },
  });
  if (!team) return error("Team not found", 404);

  const members = await prisma.teamMember.findMany({
    where: { teamId, organizationId: auth.organizationId },
    include: { user: true },
    orderBy: { joinedAt: "desc" },
  });

  return json({ members });
}

/**
 * POST /api/v1/teams/:teamId/members
 * Add a member to a team.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can add team members");
  }

  const { teamId } = await params;
  const body = await req.json();
  const { userId, role } = body;

  if (!userId) return error("userId is required");

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: auth.organizationId },
  });
  if (!team) return error("Team not found", 404);

  // Verify user is a member of the organization
  const orgMember = await prisma.teamMember.findFirst({
    where: { userId, organizationId: auth.organizationId },
  });
  if (!orgMember) return error("User is not a member of this organization", 400);

  const member = await prisma.teamMember.create({
    data: {
      organizationId: auth.organizationId,
      userId,
      teamId,
      role: role ?? "MEMBER",
    },
    include: { user: true },
  });

  return json({ member }, 201);
}
