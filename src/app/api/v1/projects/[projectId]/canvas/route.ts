import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

interface Params {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/v1/projects/:projectId/canvas
 * Get the workflow canvas for a project.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "PROJECTS");
  if (!guard.allowed) return forbidden(guard.message);

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
  });
  if (!project) return error("Project not found", 404);

  const canvas = await prisma.wfCanvas.findUnique({
    where: { projectId },
    include: { nodes: true, edges: true },
  });

  if (!canvas) return error("Canvas not found", 404);
  return json({ canvas });
}

/**
 * POST /api/v1/projects/:projectId/canvas
 * Create a workflow canvas with nodes and edges for a project.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "PROJECTS");
  if (!guard.allowed) return forbidden(guard.message);

  const { projectId } = await params;
  const body = await req.json();
  const { name, description, nodes, edges } = body;

  if (!name) return error("name is required");

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
  });
  if (!project) return error("Project not found", 404);

  // Check if canvas already exists
  const existing = await prisma.wfCanvas.findUnique({ where: { projectId } });
  if (existing) return error("Canvas already exists for this project. Use PATCH to update.", 409);

  const canvas = await prisma.wfCanvas.create({
    data: {
      projectId,
      organizationId: auth.organizationId,
      name,
      description,
      nodes: nodes
        ? {
            create: nodes.map(
              (node: {
                type: string;
                label: string;
                positionX: number;
                positionY: number;
                config?: object;
              }) => ({
                type: node.type,
                label: node.label,
                positionX: node.positionX,
                positionY: node.positionY,
                config: node.config,
              })
            ),
          }
        : undefined,
    },
    include: { nodes: true, edges: true },
  });

  // Create edges after nodes exist (need node IDs)
  if (edges && Array.isArray(edges) && edges.length > 0 && canvas.nodes.length > 0) {
    // Edges reference nodes by index in the provided nodes array
    const nodeIds = canvas.nodes.map((n) => n.id);
    for (const edge of edges) {
      const sourceNodeId = nodeIds[edge.sourceIndex];
      const targetNodeId = nodeIds[edge.targetIndex];
      if (sourceNodeId && targetNodeId) {
        await prisma.wfCanvasEdge.create({
          data: {
            canvasId: canvas.id,
            sourceNodeId,
            targetNodeId,
            condition: edge.condition,
          },
        });
      }
    }
  }

  // Re-fetch with edges included
  const result = await prisma.wfCanvas.findUnique({
    where: { id: canvas.id },
    include: { nodes: true, edges: true },
  });

  return json({ canvas: result }, 201);
}
