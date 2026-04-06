import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const entries = await prisma.contextEntry.findMany({
      where: {
        organizationId: auth.organizationId,
        category: "reply_rule",
      },
      orderBy: { createdAt: "desc" },
    });
    return json({ entries });
  } catch {
    return error("Failed to fetch rules", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { keyword, platform, response, active } = body;

    if (!keyword) return error("keyword is required");
    if (!response) return error("response is required");

    const entry = await prisma.contextEntry.create({
      data: {
        organizationId: auth.organizationId,
        entryType: "ENTITY",
        category: "reply_rule",
        key: keyword,
        value: {
          keyword,
          platform: platform || "all",
          response,
          active: active !== false,
          hitCount: 0,
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
      return error("A rule with this keyword already exists", 409);
    }
    return error("Failed to create rule", 500);
  }
}
