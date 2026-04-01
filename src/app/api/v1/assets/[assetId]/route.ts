import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { emitEvent } from "@/lib/events/emitter";

/**
 * GET /api/v1/assets/:assetId
 * Get a single asset with versions and threaded comments.
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
    include: {
      versions: { orderBy: { version: "desc" } },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
        include: {
          replies: { orderBy: { createdAt: "asc" } },
        },
      },
      library: { select: { id: true, name: true } },
      folder: { select: { id: true, name: true, path: true } },
    },
  });

  if (!asset) return error("Asset not found", 404);

  return json({ asset });
}

/**
 * PATCH /api/v1/assets/:assetId
 * Update asset metadata.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { assetId } = await params;
  const body = await req.json();
  const { name, folderId, tags, status, license, metadata } = body;

  const existing = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Asset not found", 404);

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(folderId !== undefined ? { folderId: folderId || null } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(license !== undefined ? { license } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    },
  });

  await emitEvent(
    auth.organizationId,
    "Asset",
    asset.id,
    "updated",
    { fields: Object.keys(body) },
    auth.user.id
  );

  return json({ asset });
}

/**
 * DELETE /api/v1/assets/:assetId
 * Soft-delete an asset (set status to DELETED).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { assetId } = await params;

  const existing = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Asset not found", 404);

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: { status: "DELETED" },
  });

  await emitEvent(
    auth.organizationId,
    "Asset",
    asset.id,
    "deleted",
    { name: existing.name, assetType: existing.assetType },
    auth.user.id
  );

  return json({ deleted: true });
}
