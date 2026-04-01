import {
  AgentType,
  BillingTierType,
  type Organization,
  type BillingAccount,
  type OrgModule,
} from "@prisma/client";

export interface AgentConfig {
  tools: LLMTool[];
  systemPrompt: string;
  model: string;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Build tier-scoped agent configuration.
 * This is the function that makes tier gating work at the agent level.
 */
export async function buildAgentConfig(
  org: Organization & { billingAccount: BillingAccount | null; modules: OrgModule[] },
  agentType: AgentType
): Promise<AgentConfig> {
  const tier = org.billingAccount?.tier ?? "FREE";

  const tools = getToolsForAgent(agentType);
  const systemPrompt = buildSystemPrompt(agentType, org.name, tier);
  const model = selectModel(agentType);

  return { tools, systemPrompt, model };
}

function getToolsForAgent(agentType: AgentType): LLMTool[] {
  // Context tools — available to ALL agents
  const contextTools: LLMTool[] = [
    {
      name: "readContext",
      description:
        "Read organizational context — team members, patterns, preferences, insights.",
      parameters: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: { type: "string" },
            description: "Filter by context categories",
          },
          types: {
            type: "array",
            items: { type: "string" },
            description: "Filter by context types (ENTITY, PATTERN, etc.)",
          },
          limit: { type: "number", description: "Max entries to return" },
        },
      },
    },
    {
      name: "writeContext",
      description:
        "Record a new organizational insight, pattern, or entity.",
      parameters: {
        type: "object",
        properties: {
          entryType: { type: "string", enum: ["ENTITY", "PATTERN", "PREFERENCE", "MILESTONE", "INSIGHT"] },
          category: { type: "string" },
          key: { type: "string" },
          value: { type: "object" },
          confidence: { type: "number" },
        },
        required: ["entryType", "category", "key", "value"],
      },
    },
  ];

  switch (agentType) {
    case "TASKS":
      return [
        {
          name: "createTask",
          description: "Create a new task.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Task title" },
              description: { type: "string" },
              assigneeId: { type: "string" },
              dueDate: { type: "string", description: "ISO date" },
              priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
              taskListId: { type: "string" },
            },
            required: ["title"],
          },
        },
        {
          name: "updateTask",
          description: "Update an existing task.",
          parameters: {
            type: "object",
            properties: {
              taskId: { type: "string" },
              title: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
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
            properties: { taskId: { type: "string" } },
            required: ["taskId"],
          },
        },
        {
          name: "listTasks",
          description: "List tasks with optional filters.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string" },
              assigneeId: { type: "string" },
              taskListId: { type: "string" },
            },
          },
        },
        ...contextTools,
      ];

    case "PROJECTS":
      return [
        {
          name: "createProject",
          description: "Create a new project.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              startDate: { type: "string" },
              endDate: { type: "string" },
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
              projectId: { type: "string" },
              name: { type: "string" },
              position: { type: "number" },
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
              projectId: { type: "string" },
              name: { type: "string" },
              dueDate: { type: "string" },
              description: { type: "string" },
            },
            required: ["projectId", "name"],
          },
        },
        {
          name: "createCanvas",
          description: "Create a workflow canvas with nodes and edges.",
          parameters: {
            type: "object",
            properties: {
              projectId: { type: "string" },
              name: { type: "string" },
              nodes: { type: "array" },
              edges: { type: "array" },
            },
            required: ["name", "nodes"],
          },
        },
        ...contextTools,
      ];

    case "BRIEFS":
      return [
        {
          name: "createBrief",
          description: "Create a new brief.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              clientName: { type: "string" },
            },
            required: ["title"],
          },
        },
        {
          name: "generateArtifact",
          description: "Generate an artifact draft for a brief.",
          parameters: {
            type: "object",
            properties: {
              briefId: { type: "string" },
              type: { type: "string", enum: ["DOCUMENT", "DESIGN", "VIDEO", "COPY", "PRESENTATION", "OTHER"] },
              title: { type: "string" },
              instructions: { type: "string" },
            },
            required: ["briefId", "type", "title"],
          },
        },
        ...contextTools,
      ];

    case "ORDERS":
      return [
        {
          name: "createOrder",
          description: "Create a new order.",
          parameters: {
            type: "object",
            properties: {
              clientId: { type: "string" },
              items: { type: "array" },
              notes: { type: "string" },
            },
            required: ["items"],
          },
        },
        {
          name: "createCustomer",
          description: "Create a new customer.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              company: { type: "string" },
            },
            required: ["name"],
          },
        },
        ...contextTools,
      ];

    default:
      return contextTools;
  }
}

function buildSystemPrompt(
  agentType: AgentType,
  orgName: string,
  tier: BillingTierType
): string {
  const prompts: Record<string, string> = {
    ONBOARDING: `You are the SpokeStack Onboarding Agent. Your job is to learn about ${orgName} and build their workspace through conversation.

You are warm, curious, and efficient. Ask 5-7 questions. After each answer, trigger visible workspace actions (team creation, workflow setup, role assignment). The user should see their workspace materializing in real time as they talk to you.

When you have enough context, transition to the Reveal — show the completed workspace and introduce the Tasks Agent.

You write to the Context Graph as you learn. Every entity (team member, client, workflow pattern) gets a ContextEntry so mode agents have full context from their first interaction.`,

    TASKS: `You are the Tasks Agent for ${orgName}. You manage task creation, assignment, tracking, and completion. You read from the shared context graph to understand team dynamics, past patterns, and organizational preferences.

You are flexible about what constitutes a "task." A construction company's tasks look nothing like an agency's tasks. Adapt to how this organization works.

When you detect patterns that suggest a user might benefit from Projects, Briefs, or Orders capabilities, mention it naturally — not as a sales pitch, but as a genuine observation.`,

    PROJECTS: `You are the Projects Agent for ${orgName}. You manage project planning, workflow design (WfCanvas), milestone tracking, and execution monitoring.

You read historical project data from the context graph to make predictions and recommendations. When you see patterns across projects — bottlenecks, timeline slips, resource conflicts — you surface them proactively.

You can create and modify WfCanvas workflows. When a user describes a process, translate it into a visual workflow with nodes and edges.`,

    BRIEFS: `You are the Briefs Agent for ${orgName}. You manage the brief lifecycle from intake through delivery. You can decompose briefs into phases, generate artifact drafts, route artifacts for review, and track approval cycles.

For complex briefs, you can coordinate parallel artifact generation. You learn creative preferences, revision patterns, and approval velocity to make the process faster over time.`,

    ORDERS: `You are the Orders Agent for ${orgName}. You manage customers, orders, invoicing, and commercial intelligence. You track purchasing patterns, seasonal trends, and customer relationships.

You can generate invoices, track payment status, and surface insights about the business's commercial health. You read the context graph to connect order patterns with project and task data.`,
  };

  return prompts[agentType] ?? prompts.TASKS;
}

/**
 * Model selection — routes agent types to appropriate LLM models.
 */
function selectModel(agentType: AgentType): string {
  switch (agentType) {
    case "ONBOARDING":
      return "anthropic/claude-sonnet-4-20250514";
    case "TASKS":
      return "deepseek/deepseek-chat";
    case "PROJECTS":
      return "deepseek/deepseek-chat";
    case "BRIEFS":
      return "anthropic/claude-sonnet-4-20250514";
    case "ORDERS":
      return "deepseek/deepseek-chat";
    default:
      return "deepseek/deepseek-chat";
  }
}
