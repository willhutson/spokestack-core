import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ briefId: string }>;
}

/**
 * GET /api/v1/briefs/:briefId/artifacts
 * List artifacts for a brief.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "BRIEFS");
  if (!guard.allowed) return forbidden(guard.message);

  const { briefId } = await params;

  const brief = await prisma.brief.findFirst({
    where: { id: briefId, organizationId: auth.organizationId },
  });
  if (!brief) return error("Brief not found", 404);

  const artifacts = await prisma.artifact.findMany({
    where: { briefId },
    include: { reviews: true },
    orderBy: { createdAt: "desc" },
  });

  return json({ artifacts });
}

/**
 * POST /api/v1/briefs/:briefId/artifacts
 * Create an artifact for a brief.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "BRIEFS");
  if (!guard.allowed) return forbidden(guard.message);

  const { briefId } = await params;
  const body = await req.json();
  const { type, title, content, status, generatedByAgent, fileAssetId } = body;

  if (!title) return error("title is required");
  if (!type) return error("type is required");

  const brief = await prisma.brief.findFirst({
    where: { id: briefId, organizationId: auth.organizationId },
  });
  if (!brief) return error("Brief not found", 404);

  const artifact = await prisma.artifact.create({
    data: {
      briefId,
      type,
      title,
      content,
      status: status ?? "DRAFT",
      generatedByAgent: generatedByAgent ?? false,
      fileAssetId,
    },
  });

  return json({ artifact }, 201);
}
