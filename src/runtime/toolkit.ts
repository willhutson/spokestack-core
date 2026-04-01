import {
  PrismaClient,
  TaskPriority,
  NodeType,
  ContextType,
  AgentType,
  ArtifactType,
  ReviewStatus,
  OrderStatus,
  MemberRole,
} from "@prisma/client";

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

  // ── Additional Tasks Tools ──────────────────────────────────────────

  async createTaskList(params: { name: string; description?: string }) {
    // Get the next position
    const maxPos = await this.prisma.taskList.aggregate({
      where: { organizationId: this.orgId },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    return this.prisma.taskList.create({
      data: {
        organizationId: this.orgId,
        name: params.name,
        description: params.description,
        position,
      },
    });
  }

  async addComment(params: {
    taskId: string;
    content: string;
    authorId?: string;
  }) {
    return this.prisma.taskComment.create({
      data: {
        taskId: params.taskId,
        content: params.content,
        authorId: params.authorId ?? null,
      },
    });
  }

  async assignTask(params: { taskId: string; assigneeId: string }) {
    const task = await this.prisma.task.update({
      where: { id: params.taskId },
      data: { assigneeId: params.assigneeId },
      include: { taskList: true },
    });
    return { success: true, task };
  }

  async searchTasks(params: {
    query: string;
    status?: string;
    limit?: number;
  }) {
    return this.prisma.task.findMany({
      where: {
        organizationId: this.orgId,
        OR: [
          { title: { contains: params.query, mode: "insensitive" } },
          { description: { contains: params.query, mode: "insensitive" } },
        ],
        ...(params.status ? { status: params.status as any } : {}),
      },
      include: { taskList: true },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 20,
    });
  }

  // ── Briefs Agent Tools ────────────────────────────────────────────────

  async createBrief(params: {
    title: string;
    description?: string;
    clientName?: string;
    createdById?: string;
  }) {
    const brief = await this.prisma.brief.create({
      data: {
        organizationId: this.orgId,
        title: params.title,
        description: params.description,
        clientName: params.clientName,
        createdById: params.createdById,
      },
    });

    await this.detectEntities(
      `${params.title} ${params.description || ""} ${params.clientName || ""}`
    );

    return { success: true, brief };
  }

  async addBriefPhase(params: {
    briefId: string;
    name: string;
    position: number;
    assigneeId?: string;
    dueDate?: string;
  }) {
    return this.prisma.briefPhase.create({
      data: {
        briefId: params.briefId,
        name: params.name,
        position: params.position,
        assigneeId: params.assigneeId,
        dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      },
    });
  }

  async generateArtifact(params: {
    briefId: string;
    type: ArtifactType;
    title: string;
    instructions?: string;
  }) {
    // Generate artifact content placeholder — in production this would
    // invoke a specialized LLM call for content generation
    const content = {
      title: params.title,
      type: params.type,
      instructions: params.instructions ?? "",
      generatedContent: `[Draft ${params.type.toLowerCase()} artifact: ${params.title}]`,
      note: "This is an AI-generated draft. Please review and edit before use.",
    };

    const artifact = await this.prisma.artifact.create({
      data: {
        briefId: params.briefId,
        type: params.type,
        title: params.title,
        content,
        status: "DRAFT",
        generatedByAgent: true,
      },
    });

    // Update brief status to ACTIVE if it was DRAFT
    await this.prisma.brief.updateMany({
      where: { id: params.briefId, status: "DRAFT" },
      data: { status: "ACTIVE" },
    });

    return { success: true, artifact };
  }

  async submitForReview(params: {
    artifactId: string;
    reviewerId: string;
  }) {
    // Update artifact status to IN_REVIEW
    const artifact = await this.prisma.artifact.update({
      where: { id: params.artifactId },
      data: { status: "IN_REVIEW" },
    });

    // Create the review record
    const review = await this.prisma.artifactReview.create({
      data: {
        artifactId: params.artifactId,
        reviewerId: params.reviewerId,
        status: "REVISION_REQUESTED", // Default — reviewer will update
      },
    });

    return { success: true, artifact, review };
  }

  async recordReview(params: {
    artifactId: string;
    reviewerId: string;
    status: ReviewStatus;
    comments?: string;
  }) {
    const review = await this.prisma.artifactReview.create({
      data: {
        artifactId: params.artifactId,
        reviewerId: params.reviewerId,
        status: params.status,
        comments: params.comments,
      },
    });

    // Update artifact status based on review
    const newStatus =
      params.status === "APPROVED"
        ? "APPROVED"
        : params.status === "REJECTED"
          ? "REJECTED"
          : "DRAFT"; // REVISION_REQUESTED goes back to draft

    await this.prisma.artifact.update({
      where: { id: params.artifactId },
      data: {
        status: newStatus as any,
        version: params.status === "REVISION_REQUESTED" ? { increment: 1 } : undefined,
      },
    });

    return { success: true, review };
  }

  async listBriefs(filters?: { status?: string; clientName?: string }) {
    return this.prisma.brief.findMany({
      where: {
        organizationId: this.orgId,
        ...(filters?.status ? { status: filters.status as any } : {}),
        ...(filters?.clientName
          ? { clientName: { contains: filters.clientName, mode: "insensitive" as const } }
          : {}),
      },
      include: {
        phases: { orderBy: { position: "asc" } },
        artifacts: { include: { reviews: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getBriefStatus(params: { briefId: string }) {
    const brief = await this.prisma.brief.findUnique({
      where: { id: params.briefId },
      include: {
        phases: { orderBy: { position: "asc" } },
        artifacts: {
          include: { reviews: { orderBy: { createdAt: "desc" } } },
        },
      },
    });

    if (!brief) throw new Error(`Brief ${params.briefId} not found`);

    const totalArtifacts = brief.artifacts.length;
    const approvedArtifacts = brief.artifacts.filter(
      (a) => a.status === "APPROVED"
    ).length;
    const inReviewArtifacts = brief.artifacts.filter(
      (a) => a.status === "IN_REVIEW"
    ).length;

    return {
      brief,
      summary: {
        status: brief.status,
        totalPhases: brief.phases.length,
        completedPhases: brief.phases.filter((p) => p.status === "COMPLETED").length,
        totalArtifacts,
        approvedArtifacts,
        inReviewArtifacts,
        draftArtifacts: totalArtifacts - approvedArtifacts - inReviewArtifacts,
      },
    };
  }

  // ── Orders Agent Tools ────────────────────────────────────────────────

  async createClient(params: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  }) {
    const client = await this.prisma.client.create({
      data: {
        organizationId: this.orgId,
        ...params,
      },
    });

    await this.detectEntities(
      `${params.name} ${params.company || ""}`
    );

    return { success: true, client };
  }

  async createOrder(params: {
    clientId?: string;
    items: { description: string; quantity: number; unitPriceCents: number }[];
    notes?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Calculate total
      const totalCents = params.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceCents,
        0
      );

      const order = await tx.order.create({
        data: {
          organizationId: this.orgId,
          clientId: params.clientId,
          totalCents,
          notes: params.notes,
        },
      });

      const items = [];
      for (const item of params.items) {
        const created = await tx.orderItem.create({
          data: {
            orderId: order.id,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalCents: item.quantity * item.unitPriceCents,
          },
        });
        items.push(created);
      }

      return { success: true, order, items, totalCents };
    });
  }

  async updateOrder(params: {
    orderId: string;
    status?: OrderStatus;
    notes?: string;
  }) {
    const { orderId, ...updates } = params;
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: updates as any,
      include: { items: true, client: true },
    });
    return { success: true, order };
  }

  async generateInvoice(params: { orderId: string; dueDate?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: params.orderId },
        include: { items: true, client: true, invoice: true },
      });

      if (!order) throw new Error(`Order ${params.orderId} not found`);
      if (order.invoice) throw new Error(`Order ${params.orderId} already has an invoice`);

      // Generate invoice number
      const count = await tx.invoice.count({
        where: { organizationId: this.orgId },
      });
      const invoiceNumber = `INV-${String(count + 1).padStart(5, "0")}`;

      const invoice = await tx.invoice.create({
        data: {
          organizationId: this.orgId,
          clientId: order.clientId,
          orderId: order.id,
          number: invoiceNumber,
          status: "DRAFT",
          totalCents: order.totalCents,
          currency: order.currency,
          issuedAt: new Date(),
          dueDate: params.dueDate
            ? new Date(params.dueDate)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      // Copy order items to invoice items
      for (const item of order.items) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalCents: item.totalCents,
          },
        });
      }

      return { success: true, invoice, invoiceNumber };
    });
  }

  async listOrders(filters?: {
    status?: string;
    clientId?: string;
    limit?: number;
  }) {
    return this.prisma.order.findMany({
      where: {
        organizationId: this.orgId,
        ...(filters?.status ? { status: filters.status as any } : {}),
        ...(filters?.clientId ? { clientId: filters.clientId } : {}),
      },
      include: { items: true, client: true, invoice: true },
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 50,
    });
  }

  async listClients(filters?: { search?: string; limit?: number }) {
    return this.prisma.client.findMany({
      where: {
        organizationId: this.orgId,
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" as const } },
                { email: { contains: filters.search, mode: "insensitive" as const } },
                { company: { contains: filters.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 50,
    });
  }

  async getRevenueInsights(params?: { periodDays?: number }) {
    const days = params?.periodDays ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        organizationId: this.orgId,
        createdAt: { gte: since },
        status: { not: "CANCELED" },
      },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalCents, 0);
    const averageOrderValue =
      orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

    // Top clients by revenue
    const clientRevenue = new Map<
      string,
      { name: string; totalCents: number; orderCount: number }
    >();
    for (const order of orders) {
      const cId = order.clientId ?? "unknown";
      const cName = order.client?.name ?? "Unknown";
      const existing = clientRevenue.get(cId) ?? {
        name: cName,
        totalCents: 0,
        orderCount: 0,
      };
      existing.totalCents += order.totalCents;
      existing.orderCount += 1;
      clientRevenue.set(cId, existing);
    }

    const topClients = [...clientRevenue.entries()]
      .sort((a, b) => b[1].totalCents - a[1].totalCents)
      .slice(0, 5)
      .map(([id, data]) => ({ clientId: id, ...data }));

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    for (const order of orders) {
      statusBreakdown[order.status] = (statusBreakdown[order.status] ?? 0) + 1;
    }

    // Overdue invoices
    const overdueInvoices = await this.prisma.invoice.count({
      where: {
        organizationId: this.orgId,
        status: "SENT",
        dueDate: { lt: new Date() },
      },
    });

    return {
      periodDays: days,
      totalOrders: orders.length,
      totalRevenueCents: totalRevenue,
      averageOrderValueCents: averageOrderValue,
      topClients,
      statusBreakdown,
      overdueInvoices,
    };
  }

  // ── Onboarding / Workspace Building Tools ─────────────────────────────

  async createTeam(params: { name: string; description?: string }) {
    return this.prisma.team.create({
      data: {
        organizationId: this.orgId,
        name: params.name,
        description: params.description,
      },
    });
  }

  async addTeamMember(params: {
    name: string;
    email: string;
    role?: MemberRole;
    teamId?: string;
  }) {
    // Create or find user by email — during onboarding these are stubs
    // that get linked to real Supabase users when they accept invitations
    let user = await this.prisma.user.findUnique({
      where: { email: params.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: params.email,
          name: params.name,
          supabaseId: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        },
      });
    }

    const member = await this.prisma.teamMember.create({
      data: {
        organizationId: this.orgId,
        userId: user.id,
        teamId: params.teamId,
        role: params.role ?? "MEMBER",
      },
    });

    // Write to context graph
    await this.writeContext({
      entryType: "ENTITY",
      category: "team",
      key: params.email.split("@")[0],
      value: { name: params.name, email: params.email, role: params.role ?? "MEMBER" },
      confidence: 0.9,
      sourceAgentType: "ONBOARDING",
    });

    return { success: true, user, member };
  }

  async setOrgSettings(params: {
    timezone?: string;
    language?: string;
    weekStartDay?: number;
  }) {
    const settings = await this.prisma.orgSettings.upsert({
      where: { organizationId: this.orgId },
      update: {
        ...(params.timezone ? { timezone: params.timezone } : {}),
        ...(params.language ? { language: params.language } : {}),
        ...(params.weekStartDay !== undefined
          ? { weekStartDay: params.weekStartDay }
          : {}),
      },
      create: {
        organizationId: this.orgId,
        timezone: params.timezone ?? "UTC",
        language: params.language ?? "en",
        weekStartDay: params.weekStartDay ?? 1,
      },
    });
    return { success: true, settings };
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
