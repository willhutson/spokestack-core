import type { LLMTool } from "../config";

// ── Context Tools (available to ALL agents) ──────────────────────────────

export const CONTEXT_TOOLS: LLMTool[] = [
  {
    name: "readContext",
    description:
      "Read organizational context from the shared context graph — team members, patterns, preferences, insights.",
    parameters: {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter by context categories (e.g. team, client, workflow, preference)",
        },
        types: {
          type: "array",
          items: {
            type: "string",
            enum: ["ENTITY", "PATTERN", "PREFERENCE", "MILESTONE", "INSIGHT"],
          },
          description: "Filter by context entry types",
        },
        limit: {
          type: "number",
          description: "Max entries to return (default 20)",
        },
      },
    },
  },
  {
    name: "writeContext",
    description:
      "Record a new organizational insight, pattern, entity, or preference to the shared context graph.",
    parameters: {
      type: "object",
      properties: {
        entryType: {
          type: "string",
          enum: ["ENTITY", "PATTERN", "PREFERENCE", "MILESTONE", "INSIGHT"],
          description: "The type of context entry",
        },
        category: {
          type: "string",
          description:
            "Category for grouping (e.g. team, client, workflow, preference, business)",
        },
        key: {
          type: "string",
          description: "Unique key within the category (e.g. person name, pattern name)",
        },
        value: {
          type: "object",
          description: "Structured data for this context entry",
        },
        confidence: {
          type: "number",
          description: "Confidence level 0-1 (default 0.5)",
        },
      },
      required: ["entryType", "category", "key", "value"],
    },
  },
];

// ── Tasks Agent Tools ────────────────────────────────────────────────────

export const TASKS_TOOLS: LLMTool[] = [
  {
    name: "createTask",
    description: "Create a new task.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        assigneeId: {
          type: "string",
          description: "ID of the team member to assign",
        },
        dueDate: { type: "string", description: "Due date in ISO format" },
        priority: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          description: "Task priority",
        },
        taskListId: {
          type: "string",
          description: "ID of the task list to add this task to",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "updateTask",
    description: "Update an existing task's properties.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task to update" },
        title: { type: "string" },
        description: { type: "string" },
        status: {
          type: "string",
          enum: ["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"],
        },
        priority: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        },
        assigneeId: { type: "string" },
        dueDate: { type: "string" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "completeTask",
    description: "Mark a task as done.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task to complete" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "listTasks",
    description: "List tasks with optional filters.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"],
        },
        assigneeId: { type: "string" },
        taskListId: { type: "string" },
      },
    },
  },
  {
    name: "createTaskList",
    description: "Create a new task list to organize tasks.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the task list" },
        description: { type: "string", description: "Description of the task list" },
      },
      required: ["name"],
    },
  },
  {
    name: "addComment",
    description: "Add a comment to a task.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task" },
        content: { type: "string", description: "Comment content" },
        authorId: { type: "string", description: "ID of the comment author (null for agent)" },
      },
      required: ["taskId", "content"],
    },
  },
  {
    name: "assignTask",
    description: "Assign a task to a team member.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of the task" },
        assigneeId: { type: "string", description: "ID of the team member to assign" },
      },
      required: ["taskId", "assigneeId"],
    },
  },
  {
    name: "searchTasks",
    description: "Search tasks by keyword across titles and descriptions.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword" },
        status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"] },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["query"],
    },
  },
  ...CONTEXT_TOOLS,
];

// ── Projects Agent Tools ─────────────────────────────────────────────────

export const PROJECTS_TOOLS: LLMTool[] = [
  {
    name: "createProject",
    description: "Create a new project.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        description: { type: "string" },
        startDate: { type: "string", description: "Start date in ISO format" },
        endDate: { type: "string", description: "End date in ISO format" },
      },
      required: ["name"],
    },
  },
  {
    name: "addPhase",
    description: "Add a phase to a project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "ID of the project" },
        name: { type: "string", description: "Phase name" },
        position: {
          type: "number",
          description: "Position in the phase order (0-indexed)",
        },
      },
      required: ["projectId", "name", "position"],
    },
  },
  {
    name: "addMilestone",
    description: "Add a milestone to a project.",
    parameters: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "ID of the project" },
        name: { type: "string", description: "Milestone name" },
        dueDate: { type: "string", description: "Due date in ISO format" },
        description: { type: "string" },
      },
      required: ["projectId", "name"],
    },
  },
  {
    name: "createCanvas",
    description:
      "Create a workflow canvas with nodes and edges. Nodes are created sequentially to preserve order.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "ID of the project to attach the canvas to",
        },
        name: { type: "string", description: "Canvas name" },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "START",
                  "END",
                  "ACTION",
                  "CONDITION",
                  "DELAY",
                  "APPROVAL",
                  "NOTIFICATION",
                ],
              },
              label: { type: "string" },
              positionX: { type: "number" },
              positionY: { type: "number" },
              config: { type: "object" },
            },
            required: ["type", "label", "positionX", "positionY"],
          },
          description: "Array of workflow nodes",
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceIndex: {
                type: "number",
                description: "Index of source node in the nodes array",
              },
              targetIndex: {
                type: "number",
                description: "Index of target node in the nodes array",
              },
              condition: { type: "object" },
            },
            required: ["sourceIndex", "targetIndex"],
          },
          description: "Array of edges connecting nodes",
        },
      },
      required: ["name", "nodes"],
    },
  },
  ...CONTEXT_TOOLS,
];

// ── Briefs Agent Tools ───────────────────────────────────────────────────

export const BRIEFS_TOOLS: LLMTool[] = [
  {
    name: "createBrief",
    description: "Create a new creative brief.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Brief title" },
        description: { type: "string", description: "Brief description and scope" },
        clientName: { type: "string", description: "Client name" },
      },
      required: ["title"],
    },
  },
  {
    name: "addBriefPhase",
    description: "Add a phase to a brief to structure the work.",
    parameters: {
      type: "object",
      properties: {
        briefId: { type: "string", description: "ID of the brief" },
        name: { type: "string", description: "Phase name" },
        position: { type: "number", description: "Position in phase order" },
        assigneeId: { type: "string", description: "ID of the assigned team member" },
        dueDate: { type: "string", description: "Phase due date in ISO format" },
      },
      required: ["briefId", "name", "position"],
    },
  },
  {
    name: "generateArtifact",
    description:
      "Generate a draft artifact for a brief. The artifact content is AI-generated and marked for human review.",
    parameters: {
      type: "object",
      properties: {
        briefId: { type: "string", description: "ID of the brief" },
        type: {
          type: "string",
          enum: [
            "DOCUMENT",
            "DESIGN",
            "VIDEO",
            "COPY",
            "PRESENTATION",
            "OTHER",
          ],
          description: "Type of artifact to generate",
        },
        title: { type: "string", description: "Artifact title" },
        instructions: {
          type: "string",
          description: "Instructions for content generation",
        },
      },
      required: ["briefId", "type", "title"],
    },
  },
  {
    name: "submitForReview",
    description: "Submit an artifact for review by a team member.",
    parameters: {
      type: "object",
      properties: {
        artifactId: { type: "string", description: "ID of the artifact" },
        reviewerId: { type: "string", description: "ID of the reviewer" },
      },
      required: ["artifactId", "reviewerId"],
    },
  },
  {
    name: "recordReview",
    description: "Record a review decision on an artifact.",
    parameters: {
      type: "object",
      properties: {
        artifactId: { type: "string", description: "ID of the artifact" },
        reviewerId: { type: "string", description: "ID of the reviewer" },
        status: {
          type: "string",
          enum: ["APPROVED", "REVISION_REQUESTED", "REJECTED"],
          description: "Review decision",
        },
        comments: { type: "string", description: "Review comments" },
      },
      required: ["artifactId", "reviewerId", "status"],
    },
  },
  {
    name: "listBriefs",
    description: "List briefs with optional status filter.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "IN_REVIEW", "COMPLETED", "ARCHIVED"],
        },
        clientName: { type: "string" },
      },
    },
  },
  {
    name: "getBriefStatus",
    description:
      "Get detailed status of a brief including all phases and artifacts.",
    parameters: {
      type: "object",
      properties: {
        briefId: { type: "string", description: "ID of the brief" },
      },
      required: ["briefId"],
    },
  },
  ...CONTEXT_TOOLS,
];

// ── Orders Agent Tools ───────────────────────────────────────────────────

export const ORDERS_TOOLS: LLMTool[] = [
  {
    name: "createCustomer",
    description: "Create a new customer record.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer name" },
        email: { type: "string", description: "Customer email" },
        phone: { type: "string", description: "Customer phone" },
        company: { type: "string", description: "Customer company name" },
      },
      required: ["name"],
    },
  },
  {
    name: "createOrder",
    description: "Create a new order with line items.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "ID of the customer" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPriceCents: { type: "number", description: "Price per unit in cents" },
            },
            required: ["description", "quantity", "unitPriceCents"],
          },
          description: "Order line items",
        },
        notes: { type: "string", description: "Order notes" },
      },
      required: ["items"],
    },
  },
  {
    name: "updateOrder",
    description: "Update an order's status or details.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID of the order" },
        status: {
          type: "string",
          enum: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELED"],
        },
        notes: { type: "string" },
      },
      required: ["orderId"],
    },
  },
  {
    name: "generateInvoice",
    description: "Generate an invoice from an order.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID of the order" },
        dueDate: {
          type: "string",
          description: "Invoice due date in ISO format",
        },
      },
      required: ["orderId"],
    },
  },
  {
    name: "listOrders",
    description: "List orders with optional filters.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELED"],
        },
        customerId: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "listCustomers",
    description: "List customers with optional search.",
    parameters: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Search by name, email, or company",
        },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "getRevenueInsights",
    description:
      "Get revenue analytics — totals, averages, top customers, and trends.",
    parameters: {
      type: "object",
      properties: {
        periodDays: {
          type: "number",
          description: "Number of days to analyze (default 30)",
        },
      },
    },
  },
  ...CONTEXT_TOOLS,
];

// ── Onboarding Agent Tools ───────────────────────────────────────────────

export const ONBOARDING_TOOLS: LLMTool[] = [
  {
    name: "createTeam",
    description: "Create a team within the organization.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Team name" },
        description: { type: "string", description: "Team description" },
      },
      required: ["name"],
    },
  },
  {
    name: "addTeamMember",
    description:
      "Add a team member by creating a placeholder user and membership. During onboarding, this creates stub records that get linked to real users when they accept invitations.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Person's name" },
        email: { type: "string", description: "Person's email" },
        role: {
          type: "string",
          enum: ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
          description: "Team role",
        },
        teamId: {
          type: "string",
          description: "ID of the team to add them to",
        },
      },
      required: ["name", "email"],
    },
  },
  {
    name: "createWorkflow",
    description:
      "Create a workflow canvas during onboarding based on the described business process.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Workflow name (e.g. 'Client Onboarding', 'Content Production')",
        },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "START",
                  "END",
                  "ACTION",
                  "CONDITION",
                  "DELAY",
                  "APPROVAL",
                  "NOTIFICATION",
                ],
              },
              label: { type: "string" },
              positionX: { type: "number" },
              positionY: { type: "number" },
            },
            required: ["type", "label", "positionX", "positionY"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceIndex: { type: "number" },
              targetIndex: { type: "number" },
              condition: { type: "object" },
            },
            required: ["sourceIndex", "targetIndex"],
          },
        },
      },
      required: ["name", "nodes"],
    },
  },
  {
    name: "setOrgSettings",
    description: "Update organization settings discovered during onboarding.",
    parameters: {
      type: "object",
      properties: {
        timezone: { type: "string", description: "Organization timezone" },
        language: { type: "string", description: "Primary language" },
        weekStartDay: {
          type: "number",
          description: "Week start day (0=Sunday, 1=Monday)",
        },
      },
    },
  },
  ...CONTEXT_TOOLS,
];
