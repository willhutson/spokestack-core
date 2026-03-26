import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/v1/projects/:projectId/phases
 * List phases for a project.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "PROJECTS");
  if (!guard.allowed) return forbidden(guard.message);

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
  });
  if (!project) return error("Project not found", 404);

  const phases = await prisma.projectPhase.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });

  return json({ phases });
}

/**
 * POST /api/v1/projects/:projectId/phases
 * Create a new phase for a project.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "PROJECTS");
  if (!guard.allowed) return forbidden(guard.message);

  const { projectId } = await params;
  const body = await req.json();
  const { name, position, status, startDate, endDate } = body;

  if (!name) return error("name is required");
  if (position === undefined) return error("position is required");

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
  });
  if (!project) return error("Project not found", 404);

  const phase = await prisma.projectPhase.create({
    data: {
      projectId,
      name,
      position,
      status: status ?? "PENDING",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });

  return json({ phase }, 201);
}
