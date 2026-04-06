import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    category: "company",
  };

  if (search) {
    where.key = { contains: search, mode: "insensitive" };
  }

  try {
    const entries = await prisma.contextEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return json({ entries });
  } catch (err) {
    return error("Failed to fetch companies", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { name, industry, website, notes } = body;

    if (!name) {
      return error("Name is required");
    }

    const entry = await prisma.contextEntry.create({
      data: {
        organizationId: auth.organizationId,
        entryType: "ENTITY",
        category: "company",
        key: name,
        value: {
          name,
          industry: industry || null,
          website: website || null,
          notes: notes || null,
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
      return error("A company with this name already exists", 409);
    }
    return error("Failed to create company", 500);
  }
}
