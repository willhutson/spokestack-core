import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

interface Params {
  params: Promise<{ eventId: string }>;
}

/**
 * GET /api/v1/events/:eventId
 * Retrieve a single event with its handler logs.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { eventId } = await params;

  const event = await prisma.entityEvent.findFirst({
    where: { id: eventId, organizationId: auth.organizationId },
    include: {
      handlerLogs: {
        include: { subscription: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) return error("Event not found", 404);
  return json({ event });
}
