/**
 * Layout engine for Mission Control canvas.
 * Positions nodes using a grid-based approach:
 * - Projects as hub nodes in the center row
 * - Tasks clustered radially around their project
 * - Standalone tasks in a left column
 * - Orders in a right column
 * - Briefs below their related project (or in a bottom row)
 */

export interface LayoutNode {
  id: string;
  entityType: "TASK" | "PROJECT" | "BRIEF" | "ORDER" | "MILESTONE" | "AGENT_ACTION";
  entityId: string;
  label: string;
  status: string;
  priority?: string;
  positionX: number;
  positionY: number;
  parentId?: string; // e.g. projectId for a task
  metadata?: Record<string, unknown>;
}

export interface LayoutEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

const GRID = 200;
const NODE_RADIUS = 140;
const PADDING = 100;

export function computeLayout(
  entities: {
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      projectId?: string | null;
      dueDate?: string | null;
    }>;
    projects: Array<{
      id: string;
      name: string;
      status: string;
      phaseCount: number;
      completedPhases: number;
    }>;
    briefs: Array<{
      id: string;
      title: string;
      status: string;
      clientName?: string | null;
    }>;
    orders: Array<{
      id: string;
      status: string;
      totalCents: number;
      clientId?: string | null;
      clientName?: string | null;
    }>;
  }
): LayoutResult {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  // ── Projects: center row ──────────────────────────────────────
  const projectNodes: LayoutNode[] = entities.projects.map((p, i) => ({
    id: `project-${p.id}`,
    entityType: "PROJECT" as const,
    entityId: p.id,
    label: p.name,
    status: p.status,
    positionX: PADDING + 300 + i * GRID * 1.8,
    positionY: 300,
    metadata: {
      phaseCount: p.phaseCount,
      completedPhases: p.completedPhases,
    },
  }));
  nodes.push(...projectNodes);

  // ── Tasks: clustered around their project, or left column ─────
  const tasksByProject = new Map<string, typeof entities.tasks>();
  const standaloneTasks: typeof entities.tasks = [];

  for (const t of entities.tasks) {
    if (t.projectId) {
      const group = tasksByProject.get(t.projectId) ?? [];
      group.push(t);
      tasksByProject.set(t.projectId, group);
    } else {
      standaloneTasks.push(t);
    }
  }

  // Tasks orbiting their project
  for (const [projectId, tasks] of tasksByProject) {
    const parent = projectNodes.find((pn) => pn.entityId === projectId);
    if (!parent) {
      standaloneTasks.push(...tasks);
      continue;
    }

    tasks.forEach((t, i) => {
      const angle = (i / tasks.length) * Math.PI * 2 - Math.PI / 2;
      const node: LayoutNode = {
        id: `task-${t.id}`,
        entityType: "TASK",
        entityId: t.id,
        label: t.title,
        status: t.status,
        priority: t.priority,
        positionX: parent.positionX + Math.cos(angle) * NODE_RADIUS,
        positionY: parent.positionY + Math.sin(angle) * NODE_RADIUS,
        parentId: projectId,
        metadata: { dueDate: t.dueDate },
      };
      nodes.push(node);
      edges.push({
        id: `edge-task-${t.id}-project-${projectId}`,
        sourceId: node.id,
        targetId: parent.id,
      });
    });
  }

  // Standalone tasks: left column
  standaloneTasks.forEach((t, i) => {
    nodes.push({
      id: `task-${t.id}`,
      entityType: "TASK",
      entityId: t.id,
      label: t.title,
      status: t.status,
      priority: t.priority,
      positionX: PADDING,
      positionY: PADDING + i * 80,
      metadata: { dueDate: t.dueDate },
    });
  });

  // ── Briefs: below projects ────────────────────────────────────
  entities.briefs.forEach((b, i) => {
    const cx =
      projectNodes.length > 0
        ? projectNodes[Math.min(i, projectNodes.length - 1)].positionX
        : PADDING + 300 + i * GRID;
    nodes.push({
      id: `brief-${b.id}`,
      entityType: "BRIEF",
      entityId: b.id,
      label: b.title,
      status: b.status,
      positionX: cx + (i % 2 === 0 ? -60 : 60),
      positionY: 520 + Math.floor(i / 2) * 80,
      metadata: { clientName: b.clientName },
    });
  });

  // ── Orders: right column ──────────────────────────────────────
  const maxX = Math.max(
    ...nodes.map((n) => n.positionX),
    PADDING + 600
  );
  entities.orders.forEach((o, i) => {
    const node: LayoutNode = {
      id: `order-${o.id}`,
      entityType: "ORDER",
      entityId: o.id,
      label: `Order $${(o.totalCents / 100).toFixed(0)}`,
      status: o.status,
      positionX: maxX + GRID,
      positionY: PADDING + i * 80,
      metadata: {
        totalCents: o.totalCents,
        clientId: o.clientId,
        clientName: o.clientName,
        customerName: o.clientName,
      },
    };
    nodes.push(node);
  });

  // ── Calculate canvas dimensions ───────────────────────────────
  const width =
    Math.max(...nodes.map((n) => n.positionX), 800) + PADDING + 200;
  const height =
    Math.max(...nodes.map((n) => n.positionY), 600) + PADDING + 100;

  return { nodes, edges, width, height };
}
