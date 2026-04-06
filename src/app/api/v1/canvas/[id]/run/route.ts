import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * POST /api/v1/canvas/[id]/run
 * Execute a canvas workflow. Creates a ContextEntry to record the run.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { id } = await params;

  try {
    const canvas = await prisma.wfCanvas.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    });

    if (!canvas) return error("Canvas not found", 404);
    if (canvas.organizationId !== auth.organizationId) return unauthorized();

    if (canvas.nodes.length === 0) {
      return error("Canvas has no nodes to run");
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await prisma.contextEntry.upsert({
      where: {
        organizationId_category_key: {
          organizationId: auth.organizationId,
          category: "workflow_run",
          key: runId,
        },
      },
      create: {
        organizationId: auth.organizationId,
        entryType: "ENTITY",
        category: "workflow_run",
        key: runId,
        value: {
          canvasId: id,
          canvasName: canvas.name,
          status: "RUNNING",
          nodeCount: canvas.nodes.length,
          startedAt: new Date().toISOString(),
        },
      },
      update: {},
    });

    return json({ runId, status: "RUNNING" }, 201);
  } catch {
    return error("Failed to start workflow run", 500);
  }
}
