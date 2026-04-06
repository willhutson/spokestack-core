import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const platform = searchParams.get("platform");

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    category: "creator",
  };

  if (search) {
    where.key = { contains: search, mode: "insensitive" };
  }

  if (platform) {
    where.value = { path: ["platform"], equals: platform };
  }

  try {
    const entries = await prisma.contextEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return json({ entries });
  } catch {
    return error("Failed to fetch creators", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { name, handle, platform, followers, rate, email, engagementRate } = body;

    if (!name) {
      return error("Name is required");
    }

    const entry = await prisma.contextEntry.create({
      data: {
        organizationId: auth.organizationId,
        entryType: "ENTITY",
        category: "creator",
        key: name,
        value: {
          name,
          handle: handle || null,
          platform: platform || "instagram",
          followers: followers || 0,
          rate: rate || 0,
          email: email || null,
          engagementRate: engagementRate || 0,
        },
        confidence: 1.0,
      },
    });

    return json({ entry }, 201);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return error("A creator with this name already exists", 409);
    }
    return error("Failed to create creator", 500);
  }
}
