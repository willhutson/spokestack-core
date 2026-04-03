import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";
import { PublishedModuleStatus } from "@prisma/client";

const DECISION_MAP: Record<string, PublishedModuleStatus> = {
  approved: "PUBLISHED",
  rejected: "REJECTED",
  changes_requested: "CHANGES_REQUESTED",
};

/**
 * POST /api/v1/marketplace/review/[moduleId]
 * Admin decision on a marketplace module review.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const adminOrgId = process.env.SPOKESTACK_ADMIN_ORG_ID;
  if (!adminOrgId || auth.organizationId !== adminOrgId) {
    return forbidden();
  }

  const { moduleId } = await params;
  const body = await req.json();
  const { decision, feedback, securityNotes } = body;

  if (!decision || !DECISION_MAP[decision]) {
    return error(
      "decision must be one of: approved, rejected, changes_requested"
    );
  }

  const mod = await prisma.publishedModule.findUnique({
    where: { id: moduleId },
  });
  if (!mod) return error("Not found", 404);

  const updated = await prisma.publishedModule.update({
    where: { id: moduleId },
    data: {
      status: DECISION_MAP[decision],
      reviewNotes:
        [securityNotes, feedback].filter(Boolean).join("\n\n") || null,
    },
  });

  return json({ ok: true, status: updated.status });
}
