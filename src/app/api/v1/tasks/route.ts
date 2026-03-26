import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/tasks
 * List tasks for the authenticated user's organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as
    | "TODO"
    | "IN_PROGRESS"
    | "DONE"
    | "ARCHIVED"
    | null;
  const assigneeId = searchParams.get("assigneeId");
  const taskListId = searchParams.get("taskListId");

  const tasks = await prisma.task.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(status ? { status } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(taskListId ? { taskListId } : {}),
    },
    include: { taskList: true, comments: { take: 3, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({ tasks });
}

/**
 * POST /api/v1/tasks
 * Create a new task.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const body = await req.json();
  const { title, description, assigneeId, dueDate, priority, taskListId } =
    body;

  if (!title) return error("title is required");

  const task = await prisma.task.create({
    data: {
      organizationId: auth.organizationId,
      title,
      description,
      assigneeId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority ?? "MEDIUM",
      taskListId,
    },
    include: { taskList: true },
  });

  return json({ task }, 201);
}
