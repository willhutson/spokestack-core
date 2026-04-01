import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { emitEvent } from "@/lib/events/emitter";

/**
 * GET /api/v1/projects
 * List projects for the authenticated user's organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "PROJECTS");
  if (!guard.allowed) return forbidden(guard.message);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as
    | "PLANNING"
    | "ACTIVE"
    | "ON_HOLD"
    | "COMPLETED"
    | "ARCHIVED"
    | null;

  const projects = await prisma.project.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(status ? { status } : {}),
    },
    include: {
      phases: { orderBy: { position: "asc" } },
      milestones: { orderBy: { dueDate: "asc" } },
      canvas: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({ projects });
}

/**
 * POST /api/v1/projects
 * Create a new project.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "PROJECTS");
  if (!guard.allowed) return forbidden(guard.message);

  const body = await req.json();
  const { name, description, startDate, endDate } = body;

  if (!name) return error("name is required");

  const project = await prisma.project.create({
    data: {
      organizationId: auth.organizationId,
      name,
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });

  emitEvent(auth.organizationId, "Project", project.id, "created", {}, auth.user.id).catch(() => {});

  return json({ project }, 201);
}
