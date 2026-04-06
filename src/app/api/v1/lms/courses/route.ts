import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const level = searchParams.get("level");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    category: "course",
  };

  if (search) {
    where.key = { contains: search, mode: "insensitive" };
  }

  if (level) {
    where.value = { path: ["level"], equals: level };
  }

  if (category) {
    where.value = { ...(where.value as object || {}), path: ["courseCategory"], equals: category };
  }

  try {
    const entries = await prisma.contextEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return json({ entries });
  } catch {
    return error("Failed to fetch courses", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { title, description, courseCategory, level, duration, instructor, modules, status } = body;

    if (!title) {
      return error("Title is required");
    }

    const entry = await prisma.contextEntry.create({
      data: {
        organizationId: auth.organizationId,
        entryType: "ENTITY",
        category: "course",
        key: title,
        value: {
          title,
          description: description || "",
          courseCategory: courseCategory || "Skills",
          level: level || "BEGINNER",
          duration: duration || "1h",
          instructor: instructor || "",
          modules: modules || [],
          status: status || "DRAFT",
          enrollments: 0,
          rating: 0,
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
      return error("A course with this title already exists", 409);
    }
    return error("Failed to create course", 500);
  }
}
