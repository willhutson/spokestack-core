import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/task-lists
 * List task lists for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const taskLists = await prisma.taskList.findMany({
    where: { organizationId: auth.organizationId },
    include: { tasks: { orderBy: { createdAt: "desc" }, take: 10 } },
    orderBy: { position: "asc" },
  });

  return json({ taskLists });
}

/**
 * POST /api/v1/task-lists
 * Create a new task list.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const body = await req.json();
  const { name, description, position } = body;

  if (!name) return error("name is required");

  const taskList = await prisma.taskList.create({
    data: {
      organizationId: auth.organizationId,
      name,
      description,
      position: position ?? 0,
    },
  });

  return json({ taskList }, 201);
}
