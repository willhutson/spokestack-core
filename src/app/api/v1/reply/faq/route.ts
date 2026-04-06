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
        category: "reply_faq",
      },
      orderBy: { createdAt: "desc" },
    });
    return json({ entries });
  } catch {
    return error("Failed to fetch FAQs", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { question, answer, faqCategory } = body;

    if (!question) return error("question is required");
    if (!answer) return error("answer is required");

    const entry = await prisma.contextEntry.create({
      data: {
        organizationId: auth.organizationId,
        entryType: "ENTITY",
        category: "reply_faq",
        key: question,
        value: {
          question,
          answer,
          category: faqCategory || "General",
          usageCount: 0,
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
      return error("An FAQ with this question already exists", 409);
    }
    return error("Failed to create FAQ", 500);
  }
}
