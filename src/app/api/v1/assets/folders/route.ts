import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * POST /api/v1/assets/folders
 * Create a new folder inside a library. Computes path and depth from parent.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { libraryId, name, parentId } = body;

  if (!libraryId) return error("libraryId is required");
  if (!name) return error("name is required");

  // Verify library belongs to org
  const library = await prisma.assetLibrary.findFirst({
    where: { id: libraryId, organizationId: auth.organizationId },
  });
  if (!library) return error("Library not found", 404);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let path = `/${slug}`;
  let depth = 0;

  if (parentId) {
    const parent = await prisma.assetFolder.findFirst({
      where: { id: parentId, libraryId },
    });
    if (!parent) return error("Parent folder not found", 404);
    path = `${parent.path}/${slug}`;
    depth = parent.depth + 1;
  }

  const folder = await prisma.assetFolder.create({
    data: {
      libraryId,
      name,
      slug,
      parentId: parentId ?? null,
      path,
      depth,
    },
  });

  return json({ folder }, 201);
}
