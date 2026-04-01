import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { emitEvent } from "@/lib/events/emitter";

interface Params {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/v1/projects/:projectId
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "PROJECTS");
  if (!guard.allowed) return forbidden(guard.message);

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
    include: {
      phases: { orderBy: { position: "asc" } },
      milestones: { orderBy: { dueDate: "asc" } },
      canvas: { include: { nodes: true, edges: true } },
    },
  });

  if (!project) return error("Project not found", 404);
  return json({ project });
}

/**
 * PATCH /api/v1/projects/:projectId
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "PROJECTS");
  if (!guard.allowed) return forbidden(guard.message);

  const { projectId } = await params;
  const body = await req.json();

  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Project not found", 404);

  const { name, description, status, startDate, endDate } = body;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(startDate !== undefined
        ? { startDate: startDate ? new Date(startDate) : null }
        : {}),
      ...(endDate !== undefined
        ? { endDate: endDate ? new Date(endDate) : null }
        : {}),
    },
    include: {
      phases: { orderBy: { position: "asc" } },
      milestones: true,
    },
  });

  emitEvent(auth.organizationId, "Project", projectId, "updated", { changedFields: Object.keys(body) }, auth.user.id).catch(() => {});
  if (existing.status !== project.status) {
    emitEvent(auth.organizationId, "Project", projectId, "status_changed", { from: existing.status, to: project.status }, auth.user.id).catch(() => {});
  }

  return json({ project });
}

/**
 * DELETE /api/v1/projects/:projectId
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { projectId } = await params;

  const existing = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Project not found", 404);

  await prisma.project.delete({ where: { id: projectId } });

  emitEvent(auth.organizationId, "Project", projectId, "deleted", {}, auth.user.id).catch(() => {});

  return json({ deleted: true });
}
