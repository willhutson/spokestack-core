import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/canvas
 * List all WfCanvas for the authenticated org.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const canvases = await prisma.wfCanvas.findMany({
      where: { organizationId: auth.organizationId },
      include: {
        nodes: { select: { id: true } },
        edges: { select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    const result = canvases.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      nodeCount: c.nodes.length,
      edgeCount: c.edges.length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return json({ canvases: result });
  } catch {
    return error("Failed to fetch canvases", 500);
  }
}

/**
 * POST /api/v1/canvas
 * Create a new canvas with name and optional description, nodes, edges.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { name, description, nodes, edges } = body;

    if (!name) return error("name is required");

    const canvas = await prisma.wfCanvas.create({
      data: {
        organizationId: auth.organizationId,
        name,
        description: description || null,
        nodes: nodes?.length
          ? {
              create: nodes.map(
                (n: { type: string; label: string; positionX: number; positionY: number; config?: unknown }) => ({
                  type: n.type,
                  label: n.label,
                  positionX: n.positionX,
                  positionY: n.positionY,
                  config: n.config ?? undefined,
                })
              ),
            }
          : undefined,
      },
      include: { nodes: true, edges: true },
    });

    return json({ canvas }, 201);
  } catch {
    return error("Failed to create canvas", 500);
  }
}
