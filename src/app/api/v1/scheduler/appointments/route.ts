import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    category: "appointment",
  };

  if (status) {
    where.value = { path: ["status"], equals: status };
  }

  try {
    let entries = await prisma.contextEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (from || to) {
      entries = entries.filter((e) => {
        const dateStr = (e.value as Record<string, unknown>).date as string;
        if (!dateStr) return true;
        if (from && dateStr < from) return false;
        if (to && dateStr > to) return false;
        return true;
      });
    }

    return json({ entries });
  } catch {
    return error("Failed to fetch appointments", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { title, date, time, duration, location, attendees, type, status } =
      body;

    if (!title) return error("title is required");
    if (!date) return error("date is required");

    const entry = await prisma.contextEntry.create({
      data: {
        organizationId: auth.organizationId,
        entryType: "ENTITY",
        category: "appointment",
        key: title,
        value: {
          title,
          date,
          time: time || "09:00",
          duration: duration || 60,
          location: location || "",
          attendees: attendees || [],
          type: type || "general",
          status: status || "PENDING",
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
      return error("An appointment with this title already exists", 409);
    }
    return error("Failed to create appointment", 500);
  }
}
