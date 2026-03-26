import { AgentType, BillingTierType } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

export interface RouteDecision {
  agentType: AgentType;
  confidence: number;
  reasoning?: string;
}

/**
 * MC Router — Intent Detection & Agent Dispatch.
 *
 * Receives user input from any surface, detects intent,
 * and routes to the appropriate agent.
 */
export class MCRouter {
  /**
   * Route a user message to the appropriate agent.
   * Uses keyword matching as the initial implementation.
   * LLM-based classification (DeepSeek) to be added in Week 3.
   */
  async route(
    message: string,
    orgId: string,
    activeSessionId?: string
  ): Promise<RouteDecision> {
    // 1. If there's an active session and the message seems like continuation, stay
    if (activeSessionId) {
      const session = await prisma.agentSession.findUnique({
        where: { id: activeSessionId },
      });
      if (session && this.isContinuation(message)) {
        return { agentType: session.agentType, confidence: 0.9 };
      }
    }

    // 2. Check tier — only route to agents the org has access to
    const tier = await this.getOrgTier(orgId);
    const available = this.getAvailableAgents(tier);

    // 3. Classify intent via keyword matching
    const classification = this.classifyByKeywords(message);

    // 4. If intent maps to a gated agent, still return it with a note
    if (
      classification.agentType !== "ONBOARDING" &&
      classification.agentType !== "MODULE" &&
      !available.includes(classification.agentType)
    ) {
      // Return the agent type anyway — the executor will handle the upgrade prompt
      return {
        agentType: classification.agentType,
        confidence: classification.confidence,
        reasoning: `This looks like a ${classification.agentType} request. Your ${classification.agentType} Agent is available on the ${this.getRequiredTier(classification.agentType)} plan.`,
      };
    }

    return classification;
  }

  private classifyByKeywords(message: string): RouteDecision {
    const lower = message.toLowerCase();

    // Project keywords
    const projectKeywords = [
      "project",
      "workflow",
      "milestone",
      "timeline",
      "canvas",
      "phase",
      "gantt",
    ];
    if (projectKeywords.some((k) => lower.includes(k))) {
      return { agentType: "PROJECTS", confidence: 0.8 };
    }

    // Brief keywords
    const briefKeywords = [
      "brief",
      "artifact",
      "creative",
      "review",
      "approval",
      "deliverable",
      "concept",
    ];
    if (briefKeywords.some((k) => lower.includes(k))) {
      return { agentType: "BRIEFS", confidence: 0.8 };
    }

    // Order keywords
    const orderKeywords = [
      "order",
      "invoice",
      "customer",
      "payment",
      "purchase",
      "revenue",
    ];
    if (orderKeywords.some((k) => lower.includes(k))) {
      return { agentType: "ORDERS", confidence: 0.8 };
    }

    // Default to Tasks
    return { agentType: "TASKS", confidence: 0.6 };
  }

  private async getOrgTier(orgId: string): Promise<BillingTierType> {
    const billing = await prisma.billingAccount.findUnique({
      where: { organizationId: orgId },
      select: { tier: true },
    });
    return billing?.tier ?? "FREE";
  }

  private getAvailableAgents(tier: BillingTierType): AgentType[] {
    const map: Record<BillingTierType, AgentType[]> = {
      FREE: ["TASKS"],
      STARTER: ["TASKS", "PROJECTS"],
      PRO: ["TASKS", "PROJECTS", "BRIEFS"],
      BUSINESS: ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"],
      ENTERPRISE: ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"],
    };
    return map[tier];
  }

  private getRequiredTier(agentType: AgentType): string {
    const map: Record<string, string> = {
      TASKS: "Free",
      PROJECTS: "Starter ($29/mo)",
      BRIEFS: "Pro ($59/mo)",
      ORDERS: "Business ($149/mo)",
    };
    return map[agentType] ?? "Starter";
  }

  /**
   * Simple heuristic: if the message is short and doesn't contain
   * mode-switching keywords, treat it as continuation of active session.
   */
  private isContinuation(message: string): boolean {
    const switchKeywords = [
      "switch to",
      "project",
      "brief",
      "order",
      "task",
    ];
    const isShort = message.split(" ").length < 8;
    const hasSwitch = switchKeywords.some((k) =>
      message.toLowerCase().includes(k)
    );
    return isShort && !hasSwitch;
  }
}
