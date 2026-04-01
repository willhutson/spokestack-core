import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { id: true, name: true, slug: true },
  });

  return json({ org });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (!["OWNER", "ADMIN"].includes(auth.role)) {
    return error("Insufficient permissions", 403);
  }

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return error("Name is required");
  }

  const updated = await prisma.organization.update({
    where: { id: auth.organizationId },
    data: { name: name.trim() },
    select: { id: true, name: true, slug: true },
  });

  return json({ org: updated });
}
