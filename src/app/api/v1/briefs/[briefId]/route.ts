import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ briefId: string }>;
}

/**
 * GET /api/v1/briefs/:briefId
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "BRIEFS");
  if (!guard.allowed) return forbidden(guard.message);

  const { briefId } = await params;

  const brief = await prisma.brief.findFirst({
    where: { id: briefId, organizationId: auth.organizationId },
    include: {
      phases: { orderBy: { position: "asc" } },
      artifacts: { include: { reviews: true } },
    },
  });

  if (!brief) return error("Brief not found", 404);
  return json({ brief });
}

/**
 * PATCH /api/v1/briefs/:briefId
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "BRIEFS");
  if (!guard.allowed) return forbidden(guard.message);

  const { briefId } = await params;
  const body = await req.json();

  const existing = await prisma.brief.findFirst({
    where: { id: briefId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Brief not found", 404);

  const { title, description, status, clientName, clientId } = body;

  const brief = await prisma.brief.update({
    where: { id: briefId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(clientName !== undefined ? { clientName } : {}),
      ...(clientId !== undefined ? { clientId } : {}),
    },
    include: {
      phases: { orderBy: { position: "asc" } },
      artifacts: true,
    },
  });

  return json({ brief });
}

/**
 * DELETE /api/v1/briefs/:briefId
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { briefId } = await params;

  const existing = await prisma.brief.findFirst({
    where: { id: briefId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Brief not found", 404);

  await prisma.brief.delete({ where: { id: briefId } });
  return json({ deleted: true });
}
