import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/assets/libraries/:libraryId
 * Get a single library with its folders.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ libraryId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { libraryId } = await params;

  const library = await prisma.assetLibrary.findFirst({
    where: { id: libraryId, organizationId: auth.organizationId },
    include: {
      folders: { orderBy: { path: "asc" } },
      _count: { select: { assets: true } },
    },
  });

  if (!library) return error("Library not found", 404);

  return json({ library });
}

/**
 * PATCH /api/v1/assets/libraries/:libraryId
 * Update a library's name, visibility, or libraryType.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ libraryId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { libraryId } = await params;
  const body = await req.json();
  const { name, visibility, libraryType } = body;

  const existing = await prisma.assetLibrary.findFirst({
    where: { id: libraryId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Library not found", 404);

  const library = await prisma.assetLibrary.update({
    where: { id: libraryId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(visibility !== undefined ? { visibility } : {}),
      ...(libraryType !== undefined ? { libraryType } : {}),
    },
  });

  return json({ library });
}
