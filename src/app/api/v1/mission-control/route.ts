import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import {
  computeLayout,
  type LayoutResult,
} from "@/lib/mission-control/layout-engine";

/**
 * GET /api/v1/mission-control
 * Returns the org's Mission Control canvas data.
 * If no canvas exists, returns a layout computed from current workspace state.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const orgId = auth.organizationId;

  // Check if Mission Control is enabled
  const settings = await prisma.orgSettings.findUnique({
    where: { organizationId: orgId },
    select: { missionControlEnabled: true },
  });

  // Fetch current workspace state and compute layout
  const layout = await generateLayout(orgId);

  return json({
    canvas: layout,
    missionControlEnabled: settings?.missionControlEnabled ?? true,
  });
}

/**
 * POST /api/v1/mission-control/auto-generate
 * Generates (or regenerates) a canvas from current workspace state.
 * Persists it as a WfCanvas with nodes and edges.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const orgId = auth.organizationId;
  const layout = await generateLayout(orgId);

  // Persist as a WfCanvas
  await prisma.$transaction(async (tx) => {
    // Delete existing Mission Control canvas
    const existing = await tx.wfCanvas.findFirst({
      where: { organizationId: orgId, name: "Mission Control", projectId: null },
    });

    if (existing) {
      await tx.wfCanvasEdge.deleteMany({ where: { canvasId: existing.id } });
      await tx.wfCanvasNode.deleteMany({ where: { canvasId: existing.id } });
      await tx.wfCanvas.delete({ where: { id: existing.id } });
    }

    // Create new canvas
    const canvas = await tx.wfCanvas.create({
      data: {
        organizationId: orgId,
        name: "Mission Control",
        description: "Auto-generated operational view of workspace activity",
      },
    });

    // Create nodes sequentially (order matters for edge resolution)
    const nodeIdMap = new Map<string, string>();
    for (const node of layout.nodes) {
      const created = await tx.wfCanvasNode.create({
        data: {
          canvasId: canvas.id,
          type: "ACTION", // Use ACTION as generic type; entity info in config
          label: node.label,
          positionX: node.positionX,
          positionY: node.positionY,
          config: {
            entityType: node.entityType,
            entityId: node.entityId,
            status: node.status,
            priority: node.priority,
            parentId: node.parentId,
            ...node.metadata,
          },
        },
      });
      nodeIdMap.set(node.id, created.id);
    }

    // Create edges
    for (const edge of layout.edges) {
      const sourceId = nodeIdMap.get(edge.sourceId);
      const targetId = nodeIdMap.get(edge.targetId);
      if (sourceId && targetId) {
        await tx.wfCanvasEdge.create({
          data: {
            canvasId: canvas.id,
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            condition: edge.label ? { label: edge.label } : undefined,
          },
        });
      }
    }
  });

  return json({ success: true, nodeCount: layout.nodes.length, edgeCount: layout.edges.length });
}

async function generateLayout(orgId: string): Promise<LayoutResult> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [tasks, projects, briefs, orders] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId: orgId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        status: true,
        phases: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.brief.findMany({
      where: { organizationId: orgId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true, status: true, clientName: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: { organizationId: orgId, createdAt: { gte: sevenDaysAgo } },
      select: {
        id: true,
        status: true,
        totalCents: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return computeLayout({
    tasks: tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate?.toISOString() ?? null,
      projectId: null, // Tasks don't have projectId in current schema
    })),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      phaseCount: p.phases.length,
      completedPhases: p.phases.filter((ph) => ph.status === "COMPLETED")
        .length,
    })),
    briefs: briefs.map((b) => ({
      id: b.id,
      title: b.title,
      status: b.status,
      clientName: b.clientName,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalCents: o.totalCents,
      clientId: o.clientId,
      customerName: o.client?.name ?? null,
    })),
  });
}
