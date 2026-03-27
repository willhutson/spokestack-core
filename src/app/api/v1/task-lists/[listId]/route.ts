import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ listId: string }>;
}

/**
 * GET /api/v1/task-lists/:listId
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const { listId } = await params;

  const taskList = await prisma.taskList.findFirst({
    where: { id: listId, organizationId: auth.organizationId },
    include: { tasks: { orderBy: { createdAt: "desc" } } },
  });

  if (!taskList) return error("Task list not found", 404);
  return json({ taskList });
}

/**
 * PATCH /api/v1/task-lists/:listId
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const { listId } = await params;
  const body = await req.json();

  const existing = await prisma.taskList.findFirst({
    where: { id: listId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Task list not found", 404);

  const { name, description, position } = body;

  const taskList = await prisma.taskList.update({
    where: { id: listId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(position !== undefined ? { position } : {}),
    },
  });

  return json({ taskList });
}

/**
 * DELETE /api/v1/task-lists/:listId
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const { listId } = await params;

  const existing = await prisma.taskList.findFirst({
    where: { id: listId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Task list not found", 404);

  await prisma.taskList.delete({ where: { id: listId } });
  return json({ deleted: true });
}
