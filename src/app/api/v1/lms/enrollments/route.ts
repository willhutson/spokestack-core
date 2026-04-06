import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    category: "enrollment",
  };

  if (status) {
    where.value = { path: ["status"], equals: status };
  }

  try {
    const entries = await prisma.contextEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return json({ entries });
  } catch {
    return error("Failed to fetch enrollments", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { courseId, courseName, learnerName, status } = body;

    if (!courseId || !learnerName) {
      return error("courseId and learnerName are required");
    }

    const entry = await prisma.contextEntry.create({
      data: {
        organizationId: auth.organizationId,
        entryType: "ENTITY",
        category: "enrollment",
        key: `${learnerName}-${courseId}`,
        value: {
          courseId,
          courseName: courseName || "",
          learnerName,
          status: status || "IN_PROGRESS",
          progress: 0,
          score: null,
          enrolledAt: new Date().toISOString(),
          completedAt: null,
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
      return error("This enrollment already exists", 409);
    }
    return error("Failed to create enrollment", 500);
  }
}
