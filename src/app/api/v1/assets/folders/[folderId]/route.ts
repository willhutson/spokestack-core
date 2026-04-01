import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/assets/folders/:folderId
 * Get a folder with its children and assets.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { folderId } = await params;

  const folder = await prisma.assetFolder.findFirst({
    where: { id: folderId },
    include: {
      library: { select: { id: true, organizationId: true } },
      children: { orderBy: { name: "asc" } },
      assets: { where: { status: { not: "DELETED" } }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!folder || folder.library.organizationId !== auth.organizationId) {
    return error("Folder not found", 404);
  }

  return json({ folder });
}

/**
 * PATCH /api/v1/assets/folders/:folderId
 * Move or rename a folder.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { folderId } = await params;
  const body = await req.json();
  const { name, parentId } = body;

  const folder = await prisma.assetFolder.findFirst({
    where: { id: folderId },
    include: { library: { select: { organizationId: true } } },
  });

  if (!folder || folder.library.organizationId !== auth.organizationId) {
    return error("Folder not found", 404);
  }

  const newSlug = name
    ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : folder.slug;

  let newPath = `/${newSlug}`;
  let newDepth = 0;

  if (parentId !== undefined) {
    if (parentId) {
      const parent = await prisma.assetFolder.findFirst({
        where: { id: parentId, libraryId: folder.libraryId },
      });
      if (!parent) return error("Parent folder not found", 404);
      newPath = `${parent.path}/${newSlug}`;
      newDepth = parent.depth + 1;
    }
  } else if (folder.parentId) {
    const parent = await prisma.assetFolder.findUnique({
      where: { id: folder.parentId },
    });
    if (parent) {
      newPath = `${parent.path}/${newSlug}`;
      newDepth = parent.depth + 1;
    }
  }

  const updated = await prisma.assetFolder.update({
    where: { id: folderId },
    data: {
      ...(name !== undefined ? { name, slug: newSlug } : {}),
      ...(parentId !== undefined ? { parentId: parentId || null } : {}),
      path: newPath,
      depth: newDepth,
    },
  });

  return json({ folder: updated });
}

/**
 * DELETE /api/v1/assets/folders/:folderId
 * Delete a folder. Cascades to child folders, moves assets to library root (folderId = null).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { folderId } = await params;

  const folder = await prisma.assetFolder.findFirst({
    where: { id: folderId },
    include: { library: { select: { organizationId: true } } },
  });

  if (!folder || folder.library.organizationId !== auth.organizationId) {
    return error("Folder not found", 404);
  }

  // Collect all descendant folder IDs recursively
  async function getDescendantIds(parentId: string): Promise<string[]> {
    const children = await prisma.assetFolder.findMany({
      where: { parentId },
      select: { id: true },
    });
    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids.push(...(await getDescendantIds(child.id)));
    }
    return ids;
  }

  const descendantIds = await getDescendantIds(folderId);
  const allFolderIds = [folderId, ...descendantIds];

  // Move all assets in these folders to library root
  await prisma.asset.updateMany({
    where: { folderId: { in: allFolderIds } },
    data: { folderId: null },
  });

  // Delete folders (children first via reverse order)
  await prisma.assetFolder.deleteMany({
    where: { id: { in: allFolderIds } },
  });

  return json({ deleted: true, foldersRemoved: allFolderIds.length });
}
