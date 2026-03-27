import { AgentType } from "@prisma/client";
import { CoreToolkit } from "../toolkit";
import type { LLMToolCall } from "../models";

/**
 * Tool executor — maps LLM tool call names to CoreToolkit methods.
 *
 * Returns the tool result as a JSON string for feeding back to the LLM.
 * Catches errors and returns them as structured error results so the
 * LLM can understand what went wrong and adjust.
 */
export async function executeToolCall(
  toolkit: CoreToolkit,
  toolCall: LLMToolCall,
  agentType: AgentType
): Promise<{ name: string; result: string }> {
  const name = toolCall.function.name;
  let args: Record<string, unknown>;

  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch (err) {
    return {
      name,
      result: JSON.stringify({
        error: "Invalid JSON in tool arguments",
        details: toolCall.function.arguments,
      }),
    };
  }

  try {
    const result = await dispatchTool(toolkit, name, args, agentType);
    return { name, result: JSON.stringify(result) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Tool execution error [${name}]:`, message);
    return {
      name,
      result: JSON.stringify({ error: `Tool ${name} failed: ${message}` }),
    };
  }
}

/**
 * Execute multiple tool calls in parallel and return all results.
 */
export async function executeToolCalls(
  toolkit: CoreToolkit,
  toolCalls: LLMToolCall[],
  agentType: AgentType
): Promise<{ callId: string; name: string; result: string }[]> {
  const results = await Promise.all(
    toolCalls.map(async (tc) => {
      const { name, result } = await executeToolCall(toolkit, tc, agentType);
      return { callId: tc.id, name, result };
    })
  );
  return results;
}

// ── Dispatcher ───────────────────────────────────────────────────────────

async function dispatchTool(
  toolkit: CoreToolkit,
  name: string,
  args: Record<string, unknown>,
  _agentType: AgentType
): Promise<unknown> {
  switch (name) {
    // ── Context Tools (all agents) ─────────────────────────────────
    case "readContext":
      return toolkit.readContext(args as any);
    case "writeContext":
      return toolkit.writeContext(args as any);

    // ── Tasks Tools ────────────────────────────────────────────────
    case "createTask":
      return toolkit.createTask(args as any);
    case "updateTask":
      return toolkit.updateTask(args as any);
    case "completeTask":
      return toolkit.completeTask(args as any);
    case "listTasks":
      return toolkit.listTasks(args as any);
    case "createTaskList":
      return toolkit.createTaskList(args as any);
    case "addComment":
      return toolkit.addComment(args as any);
    case "assignTask":
      return toolkit.assignTask(args as any);
    case "searchTasks":
      return toolkit.searchTasks(args as any);

    // ── Projects Tools ─────────────────────────────────────────────
    case "createProject":
      return toolkit.createProject(args as any);
    case "addPhase":
      return toolkit.addPhase(args as any);
    case "addMilestone":
      return toolkit.addMilestone(args as any);
    case "createCanvas":
      return toolkit.createCanvas(args as any);

    // ── Briefs Tools ───────────────────────────────────────────────
    case "createBrief":
      return toolkit.createBrief(args as any);
    case "addBriefPhase":
      return toolkit.addBriefPhase(args as any);
    case "generateArtifact":
      return toolkit.generateArtifact(args as any);
    case "submitForReview":
      return toolkit.submitForReview(args as any);
    case "recordReview":
      return toolkit.recordReview(args as any);
    case "listBriefs":
      return toolkit.listBriefs(args as any);
    case "getBriefStatus":
      return toolkit.getBriefStatus(args as any);

    // ── Orders Tools ───────────────────────────────────────────────
    case "createCustomer":
      return toolkit.createCustomer(args as any);
    case "createOrder":
      return toolkit.createOrder(args as any);
    case "updateOrder":
      return toolkit.updateOrder(args as any);
    case "generateInvoice":
      return toolkit.generateInvoice(args as any);
    case "listOrders":
      return toolkit.listOrders(args as any);
    case "listCustomers":
      return toolkit.listCustomers(args as any);
    case "getRevenueInsights":
      return toolkit.getRevenueInsights(args as any);

    // ── Onboarding Tools ───────────────────────────────────────────
    case "createTeam":
      return toolkit.createTeam(args as any);
    case "addTeamMember":
      return toolkit.addTeamMember(args as any);
    case "createWorkflow":
      return toolkit.createCanvas(args as any);
    case "setOrgSettings":
      return toolkit.setOrgSettings(args as any);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
