import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * PATCH /api/v1/assets/comments/:commentId
 * Update a comment's content or isResolved status.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { commentId } = await params;
  const body = await req.json();
  const { content, isResolved } = body;

  const comment = await prisma.assetComment.findFirst({
    where: { id: commentId },
    include: {
      asset: { select: { organizationId: true } },
    },
  });

  if (!comment || comment.asset.organizationId !== auth.organizationId) {
    return error("Comment not found", 404);
  }

  const updated = await prisma.assetComment.update({
    where: { id: commentId },
    data: {
      ...(content !== undefined ? { content } : {}),
      ...(isResolved !== undefined ? { isResolved } : {}),
    },
  });

  return json({ comment: updated });
}
