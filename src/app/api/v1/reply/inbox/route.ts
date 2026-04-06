import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    category: "reply_inbox",
  };

  if (type) {
    where.value = { path: ["type"], equals: type };
  }

  try {
    const entries = await prisma.contextEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return json({ entries });
  } catch {
    return error("Failed to fetch inbox", 500);
  }
}
