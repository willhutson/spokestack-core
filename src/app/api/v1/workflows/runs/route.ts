import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get("workflowId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
    category: "workflow_run",
  };

  if (workflowId) {
    where.value = { path: ["workflowId"], equals: workflowId };
  }

  if (status) {
    where.value = {
      ...(typeof where.value === "object" && where.value !== null
        ? where.value
        : {}),
      path: ["status"],
      equals: status,
    };
  }

  // If both filters are present, use AND
  if (workflowId && status) {
    where.AND = [
      { value: { path: ["workflowId"], equals: workflowId } },
      { value: { path: ["status"], equals: status } },
    ];
    delete where.value;
  }

  try {
    const entries = await prisma.contextEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const runs = entries.map((entry) => {
      const val =
        typeof entry.value === "object" && entry.value !== null
          ? (entry.value as Record<string, unknown>)
          : {};
      return {
        id: entry.id,
        workflowId: val.workflowId ?? null,
        workflowName: val.workflowName ?? entry.key,
        status: val.status ?? "UNKNOWN",
        startedAt: val.startedAt ?? entry.createdAt.toISOString(),
        endedAt: val.endedAt ?? null,
        duration: val.duration ?? null,
        steps: val.steps ?? [],
        error: val.error ?? null,
      };
    });

    return json({ runs });
  } catch (err) {
    return error("Failed to fetch workflow runs", 500);
  }
}
