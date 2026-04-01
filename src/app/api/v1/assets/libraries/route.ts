import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * POST /api/v1/assets/libraries
 * Create a new asset library.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { name, libraryType, visibility, clientId } = body;

  if (!name) return error("name is required");

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const library = await prisma.assetLibrary.create({
    data: {
      organizationId: auth.organizationId,
      name,
      slug,
      libraryType: libraryType ?? "GENERAL",
      visibility: visibility ?? "TEAM",
      clientId,
    },
  });

  return json({ library }, 201);
}

/**
 * GET /api/v1/assets/libraries
 * List asset libraries for the organization, with folder and asset counts.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const libraries = await prisma.assetLibrary.findMany({
    where: { organizationId: auth.organizationId },
    include: {
      _count: { select: { folders: true, assets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return json({ libraries });
}
