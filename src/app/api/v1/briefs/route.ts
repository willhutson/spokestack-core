import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/briefs
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "BRIEFS");
  if (!guard.allowed) return forbidden(guard.message);

  const briefs = await prisma.brief.findMany({
    where: { organizationId: auth.organizationId },
    include: {
      phases: { orderBy: { position: "asc" } },
      artifacts: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({ briefs });
}

/**
 * POST /api/v1/briefs
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "BRIEFS");
  if (!guard.allowed) return forbidden(guard.message);

  const body = await req.json();
  const { title, description, clientName } = body;

  if (!title) return error("title is required");

  const brief = await prisma.brief.create({
    data: {
      organizationId: auth.organizationId,
      title,
      description,
      clientName,
      createdById: auth.user.id,
    },
  });

  return json({ brief }, 201);
}
