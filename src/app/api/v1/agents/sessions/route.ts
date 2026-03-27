import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/agents/sessions
 * List active agent sessions for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const agentType = searchParams.get("agentType");
  const surface = searchParams.get("surface");
  const activeOnly = searchParams.get("active") !== "false";

  const sessions = await prisma.agentSession.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(agentType ? { agentType: agentType as never } : {}),
      ...(surface ? { surface: surface as never } : {}),
      ...(activeOnly ? { endedAt: null } : {}),
    },
    include: {
      messages: { take: 5, orderBy: { createdAt: "desc" } },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return json({ sessions });
}
