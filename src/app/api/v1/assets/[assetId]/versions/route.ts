import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * POST /api/v1/assets/:assetId/versions
 * Create a new version for an asset. Auto-increments version number.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { assetId } = await params;
  const body = await req.json();
  const { fileUrl, fileSize, changeNote } = body;

  if (!fileUrl) return error("fileUrl is required");

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: auth.organizationId },
  });
  if (!asset) return error("Asset not found", 404);

  // Get the latest version number
  const latestVersion = await prisma.assetVersion.findFirst({
    where: { assetId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const nextVersion = (latestVersion?.version ?? 0) + 1;

  const version = await prisma.assetVersion.create({
    data: {
      assetId,
      version: nextVersion,
      fileUrl,
      fileSize,
      changeNote,
      createdById: auth.user.id,
    },
  });

  // Update the asset's primary fileUrl to the latest version
  await prisma.asset.update({
    where: { id: assetId },
    data: { fileUrl, fileSize },
  });

  return json({ version }, 201);
}
