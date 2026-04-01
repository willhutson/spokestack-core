import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { emitEvent } from "@/lib/events/emitter";

/**
 * POST /api/v1/assets
 * Create a new asset with version 1.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const {
    libraryId,
    folderId,
    name,
    assetType,
    fileUrl,
    thumbnailUrl,
    mimeType,
    fileSize,
    tags,
    license,
    metadata,
  } = body;

  if (!libraryId) return error("libraryId is required");
  if (!name) return error("name is required");
  if (!assetType) return error("assetType is required");
  if (!fileUrl) return error("fileUrl is required");

  // Verify library belongs to org
  const library = await prisma.assetLibrary.findFirst({
    where: { id: libraryId, organizationId: auth.organizationId },
  });
  if (!library) return error("Library not found", 404);

  const asset = await prisma.asset.create({
    data: {
      organizationId: auth.organizationId,
      libraryId,
      folderId: folderId ?? null,
      name,
      assetType,
      fileUrl,
      thumbnailUrl,
      mimeType,
      fileSize,
      tags: tags ?? [],
      license,
      metadata: metadata ?? {},
      createdById: auth.user.id,
      versions: {
        create: {
          version: 1,
          fileUrl,
          fileSize,
          changeNote: "Initial version",
          createdById: auth.user.id,
        },
      },
    },
    include: { versions: true },
  });

  await emitEvent(
    auth.organizationId,
    "Asset",
    asset.id,
    "created",
    { libraryId, assetType, name },
    auth.user.id
  );

  return json({ asset }, 201);
}

/**
 * GET /api/v1/assets
 * Search and list assets with filters.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const libraryId = searchParams.get("libraryId");
  const folderId = searchParams.get("folderId");
  const assetType = searchParams.get("assetType");
  const tagsParam = searchParams.get("tags");
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    status: status ?? { not: "DELETED" },
  };

  if (libraryId) where.libraryId = libraryId;
  if (folderId) where.folderId = folderId;
  if (assetType) where.assetType = assetType;
  if (tagsParam) where.tags = { hasSome: tagsParam.split(",") };
  if (q) where.name = { contains: q, mode: "insensitive" };

  const assets = await prisma.asset.findMany({
    where,
    include: {
      library: { select: { id: true, name: true } },
      folder: { select: { id: true, name: true, path: true } },
      _count: { select: { versions: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return json({ assets });
}
