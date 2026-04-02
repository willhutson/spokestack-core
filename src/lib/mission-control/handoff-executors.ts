// Handoff Executors — cross-agent handoffs and bulk operations
// These functions orchestrate multi-step operations that span agents.
// No Prisma queries — delegates to the agent runtime.

import type { AgentType } from "@/lib/agents/types";
import { executeAgent, type AgentArtifact } from "./agent-builder-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HandoffContext {
  previousMessages?: { role: string; content: string }[];
  artifacts?: AgentArtifact[];
  metadata?: Record<string, unknown>;
}

export interface CalendarEvent {
  title: string;
  startAt: string; // ISO 8601
  endAt: string;
  description?: string;
  assigneeId?: string;
}

export interface HandoffResult {
  success: boolean;
  agentType: AgentType;
  content: string;
  artifacts?: AgentArtifact[];
  error?: string;
}

// ---------------------------------------------------------------------------
// executeCanvasUpgrade
// ---------------------------------------------------------------------------

export async function executeCanvasUpgrade(
  artifact: AgentArtifact,
  instruction: string,
  orgId: string
): Promise<HandoffResult> {
  try {
    const response = await executeAgent({
      agentType: "mc-executor",
      prompt: `Upgrade the following canvas artifact based on this instruction: "${instruction}"\n\nArtifact:\n${JSON.stringify(artifact.data, null, 2)}`,
      organizationId: orgId,
      context: { sourceArtifact: artifact, operation: "canvas-upgrade" },
    });

    return {
      success: true,
      agentType: "mc-executor",
      content: response.content,
      artifacts: response.artifacts,
    };
  } catch (error) {
    return {
      success: false,
      agentType: "mc-executor",
      content: "",
      error: error instanceof Error ? error.message : "Canvas upgrade failed",
    };
  }
}

// ---------------------------------------------------------------------------
// executeAgentHandoffWithAutoStart
// ---------------------------------------------------------------------------

export async function executeAgentHandoffWithAutoStart(
  fromAgent: AgentType,
  toAgent: AgentType,
  context: HandoffContext,
  orgId: string
): Promise<HandoffResult> {
  try {
    const handoffSummary = context.previousMessages
      ?.map((m) => `[${m.role}]: ${m.content}`)
      .join("\n") ?? "";

    const response = await executeAgent({
      agentType: toAgent,
      prompt: `You are receiving a handoff from ${fromAgent}. Continue assisting the user based on the following conversation context:\n\n${handoffSummary}`,
      organizationId: orgId,
      context: {
        handoffFrom: fromAgent,
        artifacts: context.artifacts,
        ...context.metadata,
      },
    });

    return {
      success: true,
      agentType: toAgent,
      content: response.content,
      artifacts: response.artifacts,
    };
  } catch (error) {
    return {
      success: false,
      agentType: toAgent,
      content: "",
      error: error instanceof Error ? error.message : "Agent handoff failed",
    };
  }
}

// ---------------------------------------------------------------------------
// executeCalendarBulkPush
// ---------------------------------------------------------------------------

export async function executeCalendarBulkPush(
  events: CalendarEvent[],
  orgId: string,
  userId: string
): Promise<HandoffResult> {
  try {
    const response = await executeAgent({
      agentType: "mc-scheduler",
      prompt: `Create the following ${events.length} calendar events:\n\n${JSON.stringify(events, null, 2)}`,
      organizationId: orgId,
      userId,
      context: { operation: "calendar-bulk-push", eventCount: events.length },
    });

    return {
      success: true,
      agentType: "mc-scheduler",
      content: response.content,
      artifacts: response.artifacts,
    };
  } catch (error) {
    return {
      success: false,
      agentType: "mc-scheduler",
      content: "",
      error: error instanceof Error ? error.message : "Calendar bulk push failed",
    };
  }
}

// ---------------------------------------------------------------------------
// executeBriefFromArtifact
// ---------------------------------------------------------------------------

export async function executeBriefFromArtifact(
  artifact: AgentArtifact,
  orgId: string,
  userId: string
): Promise<HandoffResult> {
  try {
    const response = await executeAgent({
      agentType: "module-briefs-assistant",
      prompt: `Create a new creative brief from the following artifact:\n\nTitle: ${artifact.title}\nType: ${artifact.type}\nData:\n${JSON.stringify(artifact.data, null, 2)}`,
      organizationId: orgId,
      userId,
      context: { operation: "brief-from-artifact", sourceArtifact: artifact },
    });

    return {
      success: true,
      agentType: "module-briefs-assistant",
      content: response.content,
      artifacts: response.artifacts,
    };
  } catch (error) {
    return {
      success: false,
      agentType: "module-briefs-assistant",
      content: "",
      error: error instanceof Error ? error.message : "Brief creation failed",
    };
  }
}
