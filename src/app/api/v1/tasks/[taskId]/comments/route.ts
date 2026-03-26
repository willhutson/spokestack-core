import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ taskId: string }>;
}

/**
 * GET /api/v1/tasks/:taskId/comments
 * List comments for a task.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const { taskId } = await params;

  // Verify task belongs to org
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: auth.organizationId },
  });
  if (!task) return error("Task not found", 404);

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });

  return json({ comments });
}

/**
 * POST /api/v1/tasks/:taskId/comments
 * Add a comment to a task.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "TASKS");
  if (!guard.allowed) return forbidden(guard.message);

  const { taskId } = await params;
  const body = await req.json();
  const { content } = body;

  if (!content) return error("content is required");

  // Verify task belongs to org
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: auth.organizationId },
  });
  if (!task) return error("Task not found", 404);

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      authorId: auth.user.id,
      content,
    },
  });

  return json({ comment }, 201);
}
