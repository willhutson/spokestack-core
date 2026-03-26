import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ teamId: string }>;
}

/**
 * GET /api/v1/teams/:teamId
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { teamId } = await params;

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: auth.organizationId },
    include: { members: { include: { user: true } } },
  });

  if (!team) return error("Team not found", 404);
  return json({ team });
}

/**
 * PATCH /api/v1/teams/:teamId
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can update teams");
  }

  const { teamId } = await params;
  const body = await req.json();

  const existing = await prisma.team.findFirst({
    where: { id: teamId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Team not found", 404);

  const { name, description } = body;

  const team = await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

  return json({ team });
}

/**
 * DELETE /api/v1/teams/:teamId
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can delete teams");
  }

  const { teamId } = await params;

  const existing = await prisma.team.findFirst({
    where: { id: teamId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Team not found", 404);

  await prisma.team.delete({ where: { id: teamId } });
  return json({ deleted: true });
}
