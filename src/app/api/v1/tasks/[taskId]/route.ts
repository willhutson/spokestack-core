import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ taskId: string }>;
}

/**
 * GET /api/v1/tasks/:taskId
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: auth.organizationId },
    include: { taskList: true, comments: true, attachments: true },
  });

  if (!task) return error("Task not found", 404);
  return json({ task });
}

/**
 * PATCH /api/v1/tasks/:taskId
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const { taskId } = await params;
  const body = await req.json();

  // Verify task belongs to org
  const existing = await prisma.task.findFirst({
    where: { id: taskId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Task not found", 404);

  const { title, description, status, priority, assigneeId, dueDate, taskListId } = body;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(assigneeId !== undefined ? { assigneeId } : {}),
      ...(dueDate !== undefined
        ? { dueDate: dueDate ? new Date(dueDate) : null }
        : {}),
      ...(taskListId !== undefined ? { taskListId } : {}),
      ...(status === "DONE" ? { completedAt: new Date() } : {}),
    },
    include: { taskList: true },
  });

  return json({ task });
}

/**
 * DELETE /api/v1/tasks/:taskId
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { taskId } = await params;

  const existing = await prisma.task.findFirst({
    where: { id: taskId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Task not found", 404);

  await prisma.task.delete({ where: { id: taskId } });

  return json({ deleted: true });
}
