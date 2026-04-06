import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/canvas/[id]
 * Fetch a single WfCanvas with nodes and edges.
 */
export async function GET(
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

    return json({ canvas });
  } catch {
    return error("Failed to fetch canvas", 500);
  }
}

/**
 * PATCH /api/v1/canvas/[id]
 * Update canvas name, description, and/or replace nodes + edges.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { id } = await params;

  try {
    const existing = await prisma.wfCanvas.findUnique({
      where: { id },
    });

    if (!existing) return error("Canvas not found", 404);
    if (existing.organizationId !== auth.organizationId) return unauthorized();

    const body = await req.json();
    const { name, description, nodes, edges } = body;

    // Update name/description
    await prisma.wfCanvas.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    // Replace nodes + edges if provided (simple delete-and-recreate)
    if (nodes !== undefined) {
      // Delete edges first (foreign key constraint)
      await prisma.wfCanvasEdge.deleteMany({ where: { canvasId: id } });
      await prisma.wfCanvasNode.deleteMany({ where: { canvasId: id } });

      // Create new nodes
      if (nodes.length > 0) {
        await prisma.wfCanvasNode.createMany({
          data: nodes.map(
            (n: { id: string; type: string; label: string; positionX: number; positionY: number; config?: unknown }) => ({
              id: n.id,
              canvasId: id,
              type: n.type,
              label: n.label,
              positionX: n.positionX,
              positionY: n.positionY,
              config: n.config ?? undefined,
            })
          ),
        });
      }

      // Create new edges
      if (edges && edges.length > 0) {
        await prisma.wfCanvasEdge.createMany({
          data: edges.map(
            (e: { id: string; sourceNodeId: string; targetNodeId: string; condition?: unknown }) => ({
              id: e.id,
              canvasId: id,
              sourceNodeId: e.sourceNodeId,
              targetNodeId: e.targetNodeId,
              condition: e.condition ?? undefined,
            })
          ),
        });
      }
    }

    const updated = await prisma.wfCanvas.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    });

    return json({ canvas: updated });
  } catch {
    return error("Failed to update canvas", 500);
  }
}
