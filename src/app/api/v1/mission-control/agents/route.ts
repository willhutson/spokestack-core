import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";
import { AGENTS } from "@/lib/mission-control/constants";

/**
 * GET /api/v1/mission-control/agents
 * Return the static agent list.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const agents = Object.values(AGENTS);
  return json({ agents });
}
