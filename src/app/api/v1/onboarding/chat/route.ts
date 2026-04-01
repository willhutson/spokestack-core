import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";

const ONBOARDING_SYSTEM_PROMPT = `You are SpokeStack's onboarding agent. You help new users discover which SpokeStack workflows fit their business.

SpokeStack has four core workflows:
1. **Briefs** — For agencies and creative teams. Manage creative briefs, campaign briefs, content plans.
2. **Projects** — For digital product and service delivery. Manage project phases, milestones, deadlines.
3. **Orders** — Custom order management. Create orders with line items, track fulfillment, manage clients.
4. **Tasks** — Standalone task and todo management. Can be attached to projects, briefs, or orders.

Your job:
1. Ask warm, open-ended questions to understand the user's business.
2. Based on their answers, recommend the right workflow(s).
3. Offer to connect their tools: "Want me to pull in your Google Drive? Connect your Slack?"
4. Once you know what they need, offer to create their first entity FROM the conversation.
5. When you want to CREATE an entity, include a JSON block in your response:
<action>{"type":"CREATE_BRIEF","data":{"title":"...","description":"..."}}</action>
<action>{"type":"CREATE_PROJECT","data":{"name":"...","description":"..."}}</action>
<action>{"type":"CREATE_TASK","data":{"title":"..."}}</action>
<action>{"type":"CREATE_ORDER","data":{"notes":"...","items":[{"description":"...","quantity":1,"unitPriceCents":5000}]}}</action>
6. When onboarding is COMPLETE: <action>{"type":"COMPLETE_ONBOARDING"}</action>
7. For integration connections: <action>{"type":"CONNECT_INTEGRATION","provider":"google_drive"}</action>

Keep responses under 200 words. Be warm, not salesy. Discover needs first.`;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req as any);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { messages } = await req.json();

  // Use the agent runtime if configured, otherwise use a simple echo
  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const runtimeSecret = process.env.AGENT_RUNTIME_SECRET;

  if (runtimeUrl && runtimeSecret) {
    // Proxy to agent runtime with the onboarding system prompt
    const runtimeResponse = await fetch(`${runtimeUrl}/agent/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": runtimeSecret,
      },
      body: JSON.stringify({
        message: messages[messages.length - 1]?.content ?? "",
        orgId: auth.organizationId,
        userId: auth.user.id,
        surface: "WEB",
        metadata: {
          systemPrompt: ONBOARDING_SYSTEM_PROMPT,
          conversationHistory: messages,
        },
      }),
    });

    if (runtimeResponse.ok && runtimeResponse.body) {
      return new Response(runtimeResponse.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
  }

  // Fallback: echo-style response for dev/testing
  const userMessage = messages[messages.length - 1]?.content ?? "";
  const fallbackResponse = generateFallbackResponse(userMessage, messages.length);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const words = fallbackResponse.split(" ");
      let i = 0;
      const interval = setInterval(() => {
        if (i < words.length) {
          const text = (i === 0 ? "" : " ") + words[i];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          i++;
        } else {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          clearInterval(interval);
        }
      }, 50);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function generateFallbackResponse(userMessage: string, messageCount: number): string {
  if (messageCount <= 2) {
    return "That's great to hear! Tell me more about what kind of work your team does day-to-day. Are you managing client projects, running campaigns, processing orders, or something else?";
  }
  if (messageCount <= 4) {
    return "Sounds like **Projects** and **Tasks** would be a great fit for your workflow. Would you like me to create your first project? Just give me a name and a quick description.";
  }
  if (messageCount <= 6) {
    return "I've noted that down. Would you also like to connect any tools you're already using — like Google Drive, Slack, or Asana? I can set that up in a couple of clicks.";
  }
  return `Great — you're all set up! Your workspace is ready to go. <action>{"type":"COMPLETE_ONBOARDING"}</action>`;
}
