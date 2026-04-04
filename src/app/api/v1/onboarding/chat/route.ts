import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableModules } from "@/lib/modules/registry";
import { getAllProviders } from "@/lib/integrations/nango/providers";

/**
 * Build the onboarding system prompt dynamically from:
 * 1. The module registry (all available modules)
 * 2. The Nango provider registry (all available integrations)
 * 3. The org's current state (what's already installed)
 */
async function buildDynamicOnboardingPrompt(organizationId: string): Promise<string> {
  // Get all available modules from registry
  const allModules = getAvailableModules();
  const moduleList = allModules
    .map((m) => `- **${m.name}** (${m.category}): ${m.description}`)
    .join("\n");

  // Get installed modules for this org
  const installed = await prisma.orgModule.findMany({
    where: { organizationId, active: true },
    select: { moduleType: true },
  });
  const installedSet = new Set(installed.map((m) => m.moduleType));
  const installedList = allModules
    .filter((m) => installedSet.has(m.moduleType))
    .map((m) => m.name)
    .join(", ");

  // Get available integrations from Nango providers
  const providers = getAllProviders();
  const integrationList = providers
    .map((p) => `- **${p.id}** → connects to ${p.module} module`)
    .join("\n");

  // Get org's existing integrations
  const connections = await prisma.integration.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { provider: true },
  });
  const connectedList = connections.map((c) => c.provider).join(", ") || "none yet";

  return `You are SpokeStack's onboarding agent. You help new users set up their workspace — team, modules, integrations, workflows, and branding.

## Your approach
Ask 5-7 focused questions, one or two at a time. After each answer, acknowledge what you learned and recommend next steps. Don't dump everything at once — have a conversation.

## Questions to cover (adapt based on business type)
1. What does your business do? (industry, services, products)
2. How big is your team? (members, key roles, departments)
3. What's your typical workflow? (how work flows start to finish)
4. Who are your clients/customers? (B2B vs B2C, key accounts)
5. What tools do you use today? (we can connect them)
6. What's your biggest bottleneck? (what to optimize first)
7. What does success look like in 90 days?

## Available modules (recommend based on their business)
${moduleList}

Currently installed: ${installedList || "core modules only"}

When recommending modules, suggest 2-4 that match their business type. Say:
"Based on what you've told me, I'd recommend adding:
- **[Module]** to [one-sentence reason]
Want me to install these?"

## Available integrations (offer to connect their existing tools)
${integrationList}

Currently connected: ${connectedList}

When they mention a tool (Asana, HubSpot, Slack, etc.), offer to connect it:
"I can connect your [tool] — it'll sync your data automatically. Want to set that up?"

## Business type adaptations
- **Agency/Consultancy**: Briefs, CRM, Content Studio, Social Publishing, Time & Leave
- **SaaS**: Tasks, Projects, Analytics, CRM
- **E-commerce**: Orders, CRM, Finance, Analytics
- **Construction**: Projects, Time & Leave, Finance, Workflows
- **Professional Services**: CRM, Time & Leave, Finance, Briefs
- **Media/Publishing**: Content Studio, Social Publishing, Analytics, CRM

## After setup
When you've covered the key questions and installed modules, ask about:
- Branding (logo, colors, subdomain)
- Team invites (who should have access)
- First workflow (what should be automated)

Then summarize what you've set up and suggest which agent to talk to next.

## Tone
Be genuinely curious. Ask follow-ups. You're a helpful colleague getting them set up, not a form.`;
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { messages } = await req.json();
  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const runtimeSecret = process.env.AGENT_RUNTIME_SECRET;

  if (!runtimeUrl) {
    return new Response(
      JSON.stringify({
        error: "Agent runtime not configured. Set AGENT_RUNTIME_URL.",
      }),
      { status: 503 }
    );
  }

  // Build dynamic prompt from current module + integration state
  const systemPrompt = await buildDynamicOnboardingPrompt(auth.organizationId);

  const runtimeResponse = await fetch(
    `${runtimeUrl}/api/v1/core/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(runtimeSecret ? { "X-Agent-Secret": runtimeSecret } : {}),
      },
      body: JSON.stringify({
        agent_type: "core_onboarding",
        task: messages[messages.length - 1]?.content ?? "",
        conversation_history: messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })
        ),
        org_id: auth.organizationId,
        user_id: auth.user.id,
        stream: true,
        metadata: {
          systemPrompt,
          surface: "WEB",
        },
      }),
    }
  );

  if (!runtimeResponse.ok) {
    const errBody = await runtimeResponse.text().catch(() => "");
    console.error(
      `[onboarding/chat] Agent runtime error: ${runtimeResponse.status} — ${errBody}`
    );
    return new Response(
      JSON.stringify({
        error: `Agent runtime returned ${runtimeResponse.status}`,
        detail: errBody,
      }),
      { status: 502 }
    );
  }

  if (!runtimeResponse.body) {
    return new Response(
      JSON.stringify({ error: "No response body from agent runtime" }),
      { status: 502 }
    );
  }

  return new Response(runtimeResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
