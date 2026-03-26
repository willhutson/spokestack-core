import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/v1/projects/:projectId/milestones
 * List milestones for a project.
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

  const milestones = await prisma.projectMilestone.findMany({
    where: { projectId },
    orderBy: { dueDate: "asc" },
  });

  return json({ milestones });
}

/**
 * POST /api/v1/projects/:projectId/milestones
 * Create a new milestone for a project.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "PROJECTS");
  if (!guard.allowed) return forbidden(guard.message);

  const { projectId } = await params;
  const body = await req.json();
  const { name, description, dueDate } = body;

  if (!name) return error("name is required");

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
  });
  if (!project) return error("Project not found", 404);

  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId,
      name,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });

  return json({ milestone }, 201);
}
