// Agent Prompts — ERP-specific context injection for agent system prompts
// Enriches base prompts with brand, team, and module context.

import type { AgentType } from "@/lib/agents/types";
import { AGENTS } from "@/lib/agents/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentPromptContext {
  brandName?: string;
  brandTone?: string;
  teamMembers?: TeamMemberInfo[];
  moduleContext?: string;
  organizationName?: string;
  timezone?: string;
  language?: string;
  customInstructions?: string;
}

export interface TeamMemberInfo {
  name: string;
  role: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// buildAgentSystemPrompt
// ---------------------------------------------------------------------------

export function buildAgentSystemPrompt(
  agentType: AgentType,
  basePrompt: string,
  context?: AgentPromptContext
): string {
  const meta = AGENTS[agentType];
  const sections: string[] = [];

  // Identity section
  sections.push(
    `You are ${meta.name}, a specialized AI agent in SpokeStack.`,
    `Role: ${meta.description}`,
    `Capabilities: ${meta.capabilities.join(", ")}.`
  );

  // Base prompt
  if (basePrompt) {
    sections.push("", "## Instructions", basePrompt);
  }

  // Brand context
  if (context?.brandName) {
    sections.push("", buildBrandContext(context.brandName, context.brandTone));
  }

  // Team context
  if (context?.teamMembers?.length) {
    sections.push("", buildTeamContext(context.teamMembers));
  }

  // Organization context
  if (context?.organizationName) {
    sections.push(
      "",
      `## Organization`,
      `Organization: ${context.organizationName}`,
      context.timezone ? `Timezone: ${context.timezone}` : "",
      context.language ? `Language: ${context.language}` : ""
    );
  }

  // Module context
  if (context?.moduleContext) {
    sections.push("", "## Module Context", context.moduleContext);
  }

  // Custom instructions
  if (context?.customInstructions) {
    sections.push("", "## Custom Instructions", context.customInstructions);
  }

  // Handoff awareness
  if (meta.canHandoff && meta.handoffTargets.length > 0) {
    const handoffNames = meta.handoffTargets
      .map((t) => AGENTS[t]?.name ?? t)
      .join(", ");
    sections.push(
      "",
      "## Handoff",
      `If the user's request is outside your capabilities, you can suggest handing off to: ${handoffNames}.`,
      "Indicate a handoff by including [HANDOFF:agent-type] in your response."
    );
  }

  return sections.filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// buildBrandContext
// ---------------------------------------------------------------------------

export function buildBrandContext(
  brandName: string,
  brandTone?: string
): string {
  const lines = ["## Brand Context", `Brand: ${brandName}`];

  if (brandTone) {
    lines.push(`Tone: ${brandTone}`);
    lines.push(
      `When generating content, match the brand's ${brandTone} tone of voice.`
    );
  } else {
    lines.push(
      "Maintain a professional, on-brand tone in all generated content."
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// buildTeamContext
// ---------------------------------------------------------------------------

export function buildTeamContext(teamMembers: TeamMemberInfo[]): string {
  const lines = [
    "## Team Context",
    "Team members you may reference or assign work to:",
  ];

  for (const member of teamMembers) {
    const parts = [`- ${member.name} (${member.role})`];
    if (member.email) parts.push(` — ${member.email}`);
    lines.push(parts.join(""));
  }

  return lines.join("\n");
}
