import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ memberId: string }>;
}

/**
 * PATCH /api/v1/members/:memberId
 * Update a member's role.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can update member roles");
  }

  const { memberId } = await params;
  const body = await req.json();
  const { role } = body;

  if (!role) return error("role is required");

  const existing = await prisma.teamMember.findFirst({
    where: { id: memberId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Member not found", 404);

  // Prevent demoting the last owner
  if (existing.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await prisma.teamMember.count({
      where: { organizationId: auth.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return error("Cannot remove the last owner", 400);
    }
  }

  const member = await prisma.teamMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: true },
  });

  return json({ member });
}

/**
 * DELETE /api/v1/members/:memberId
 * Remove a member from the organization.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can remove members");
  }

  const { memberId } = await params;

  const existing = await prisma.teamMember.findFirst({
    where: { id: memberId, organizationId: auth.organizationId },
  });
  if (!existing) return error("Member not found", 404);

  // Prevent removing the last owner
  if (existing.role === "OWNER") {
    const ownerCount = await prisma.teamMember.count({
      where: { organizationId: auth.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return error("Cannot remove the last owner", 400);
    }
  }

  await prisma.teamMember.delete({ where: { id: memberId } });
  return json({ deleted: true });
}
