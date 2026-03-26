import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/teams
 * List teams for the authenticated user's organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const teams = await prisma.team.findMany({
    where: { organizationId: auth.organizationId },
    include: { members: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  return json({ teams });
}

/**
 * POST /api/v1/teams
 * Create a new team.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can create teams");
  }

  const body = await req.json();
  const { name, description } = body;

  if (!name) return error("name is required");

  const team = await prisma.team.create({
    data: {
      organizationId: auth.organizationId,
      name,
      description,
    },
  });

  return json({ team }, 201);
}
