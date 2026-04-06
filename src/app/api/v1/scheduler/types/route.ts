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
        category: "appointment_type",
      },
      orderBy: { createdAt: "desc" },
    });
    return json({ entries });
  } catch {
    return error("Failed to fetch appointment types", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { name, duration, description, color, active } = body;

    if (!name) return error("name is required");

    const entry = await prisma.contextEntry.create({
      data: {
        organizationId: auth.organizationId,
        entryType: "ENTITY",
        category: "appointment_type",
        key: name,
        value: {
          name,
          duration: duration || 30,
          description: description || "",
          color: color || "#6366f1",
          active: active !== false,
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
      return error("An appointment type with this name already exists", 409);
    }
    return error("Failed to create appointment type", 500);
  }
}
