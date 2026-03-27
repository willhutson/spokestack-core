import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ briefId: string }>;
}

/**
 * GET /api/v1/briefs/:briefId/phases
 * List phases for a brief.
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

  const phases = await prisma.briefPhase.findMany({
    where: { briefId },
    orderBy: { position: "asc" },
  });

  return json({ phases });
}

/**
 * POST /api/v1/briefs/:briefId/phases
 * Create a phase for a brief.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "BRIEFS");
  if (!guard.allowed) return forbidden(guard.message);

  const { briefId } = await params;
  const body = await req.json();
  const { name, position, status, assigneeId, dueDate } = body;

  if (!name) return error("name is required");
  if (position === undefined) return error("position is required");

  const brief = await prisma.brief.findFirst({
    where: { id: briefId, organizationId: auth.organizationId },
  });
  if (!brief) return error("Brief not found", 404);

  const phase = await prisma.briefPhase.create({
    data: {
      briefId,
      name,
      position,
      status: status ?? "PENDING",
      assigneeId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });

  return json({ phase }, 201);
}
