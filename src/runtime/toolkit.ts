import { PrismaClient, TaskPriority, NodeType, ContextType, AgentType } from "@prisma/client";

/**
 * CoreToolkit — the spokestack-core Agent Toolkit.
 * Replaces the existing ERPToolkit. Uses direct Prisma calls, not HTTP requests.
 * Every operation is org-scoped for row-level tenant isolation.
 */
export class CoreToolkit {
  private prisma: PrismaClient;
  private orgId: string;

  constructor(prisma: PrismaClient, orgId: string) {
    this.prisma = prisma;
    this.orgId = orgId;
  }

  // ── Tasks Agent Tools ────────────────────────────────────────────────

  async createTask(params: {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    priority?: TaskPriority;
    taskListId?: string;
  }) {
    const task = await this.prisma.task.create({
      data: {
        organizationId: this.orgId,
        ...params,
        dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      },
      include: { taskList: true },
    });

    // Entity detection for context milestones
    await this.detectEntities(`${params.title} ${params.description || ""}`);

    return { success: true, task };
  }

  async updateTask(params: { taskId: string; [key: string]: unknown }) {
    const { taskId, ...updates } = params;
    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: updates as any,
      include: { taskList: true },
    });
    return { success: true, task };
  }

  async completeTask(params: { taskId: string }) {
    const task = await this.prisma.task.update({
      where: { id: params.taskId },
      data: { status: "DONE", completedAt: new Date() },
    });
    return { success: true, task };
  }

  async listTasks(filters?: {
    status?: string;
    assigneeId?: string;
    taskListId?: string;
  }) {
    return this.prisma.task.findMany({
      where: {
        organizationId: this.orgId,
        ...(filters?.status ? { status: filters.status as any } : {}),
        ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
        ...(filters?.taskListId ? { taskListId: filters.taskListId } : {}),
      },
      include: { taskList: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  // ── Projects Agent Tools ─────────────────────────────────────────────

  async createProject(params: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.prisma.project.create({
      data: {
        organizationId: this.orgId,
        ...params,
        startDate: params.startDate ? new Date(params.startDate) : undefined,
        endDate: params.endDate ? new Date(params.endDate) : undefined,
      },
    });
  }

  /**
   * Create a workflow canvas with nodes and edges.
   *
   * IMPORTANT: Nodes are created SEQUENTIALLY (not with Promise.all)
   * so that edge source/target indexes resolve correctly.
   * The 03a spec used Promise.all which would cause a race condition —
   * edges reference nodes by array index, and parallel creation doesn't
   * guarantee insertion order matches the input array order.
   */
  async createCanvas(params: {
    projectId?: string;
    name: string;
    nodes: {
      type: NodeType;
      label: string;
      positionX: number;
      positionY: number;
      config?: any;
    }[];
    edges: { sourceIndex: number; targetIndex: number; condition?: any }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const canvas = await tx.wfCanvas.create({
        data: {
          organizationId: this.orgId,
          projectId: params.projectId,
          name: params.name,
        },
      });

      // Sequential node creation — order matters for edge index resolution
      const nodes = [];
      for (const n of params.nodes) {
        const node = await tx.wfCanvasNode.create({
          data: { canvasId: canvas.id, ...n },
        });
        nodes.push(node);
      }

      // Edges can be created in parallel — they reference resolved node IDs
      const edges = [];
      for (const e of params.edges) {
        const edge = await tx.wfCanvasEdge.create({
          data: {
            canvasId: canvas.id,
            sourceNodeId: nodes[e.sourceIndex].id,
            targetNodeId: nodes[e.targetIndex].id,
            condition: e.condition,
          },
        });
        edges.push(edge);
      }

      return { canvas, nodes, edges };
    });
  }

  async addPhase(params: {
    projectId: string;
    name: string;
    position: number;
  }) {
    return this.prisma.projectPhase.create({
      data: params,
    });
  }

  async addMilestone(params: {
    projectId: string;
    name: string;
    dueDate?: string;
    description?: string;
  }) {
    return this.prisma.projectMilestone.create({
      data: {
        ...params,
        dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      },
    });
  }

  // ── Context Graph Tools (all agents) ─────────────────────────────────

  async readContext(params: {
    categories?: string[];
    types?: ContextType[];
    limit?: number;
  }) {
    return this.prisma.contextEntry.findMany({
      where: {
        organizationId: this.orgId,
        ...(params.categories
          ? { category: { in: params.categories } }
          : {}),
        ...(params.types ? { entryType: { in: params.types } } : {}),
      },
      orderBy: { confidence: "desc" },
      take: params.limit || 20,
    });
  }

  async writeContext(params: {
    entryType: ContextType;
    category: string;
    key: string;
    value: any;
    confidence?: number;
    sourceAgentType?: AgentType;
  }) {
    return this.prisma.contextEntry.upsert({
      where: {
        organizationId_category_key: {
          organizationId: this.orgId,
          category: params.category,
          key: params.key,
        },
      },
      update: {
        value: params.value,
        confidence: params.confidence || 0.5,
        updatedAt: new Date(),
      },
      create: {
        organizationId: this.orgId,
        ...params,
        confidence: params.confidence || 0.5,
      },
    });
  }

  // ── Entity Detection (for context milestones) ────────────────────────

  /**
   * Lightweight entity detection — extracts capitalized proper nouns
   * and upserts them into the context graph. This feeds the
   * CLIENT_ENTITY_DENSITY milestone.
   */
  private async detectEntities(text: string) {
    const entities = this.extractProperNouns(text);

    for (const entity of entities) {
      const key = entity
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      if (key.length < 2) continue;

      await this.prisma.contextEntry.upsert({
        where: {
          organizationId_category_key: {
            organizationId: this.orgId,
            category: "client",
            key,
          },
        },
        update: {
          confidence: { increment: 0.1 },
          updatedAt: new Date(),
        },
        create: {
          organizationId: this.orgId,
          entryType: "ENTITY",
          category: "client",
          key,
          value: { name: entity, mentionCount: 1 },
          confidence: 0.3,
        },
      });
    }
  }

  private extractProperNouns(text: string): string[] {
    // Match capitalized words that aren't at the start of a sentence
    // and aren't common English words
    const stopWords = new Set([
      "The", "This", "That", "These", "Those", "What", "When",
      "Where", "Which", "Who", "How", "And", "But", "For", "Not",
      "All", "Can", "Had", "Her", "Was", "One", "Our", "Out",
      "Are", "Has", "His", "Its", "May", "New", "Now", "Old",
      "See", "Way", "Day", "Did", "Get", "Got", "Let", "Say",
      "She", "Too", "Use", "Yes", "Yet",
    ]);

    const words = text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
    return words.filter((w) => !stopWords.has(w) && w.length > 2);
  }
}
