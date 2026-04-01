import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * POST /api/v1/assets/:assetId/comments
 * Add a comment to an asset. Supports threading via parentId.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { assetId } = await params;
  const body = await req.json();
  const { content, parentId, annotationType, annotationData } = body;

  if (!content) return error("content is required");

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: auth.organizationId },
  });
  if (!asset) return error("Asset not found", 404);

  if (parentId) {
    const parent = await prisma.assetComment.findFirst({
      where: { id: parentId, assetId },
    });
    if (!parent) return error("Parent comment not found", 404);
  }

  const comment = await prisma.assetComment.create({
    data: {
      assetId,
      authorId: auth.user.id,
      content,
      parentId: parentId ?? null,
      annotationType,
      annotationData,
    },
  });

  return json({ comment }, 201);
}

/**
 * GET /api/v1/assets/:assetId/comments
 * List threaded comments for an asset.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { assetId } = await params;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: auth.organizationId },
    select: { id: true },
  });
  if (!asset) return error("Asset not found", 404);

  const comments = await prisma.assetComment.findMany({
    where: { assetId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      replies: { orderBy: { createdAt: "asc" } },
    },
  });

  return json({ comments });
}
