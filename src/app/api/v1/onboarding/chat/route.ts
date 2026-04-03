import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { ONBOARDING_SYSTEM_PROMPT } from "@/lib/mission-control/onboarding-agent-prompt";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req as any);
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
        error:
          "Agent runtime not configured. Set AGENT_RUNTIME_URL to connect to ongoing_agent_builder.",
      }),
      { status: 503 }
    );
  }

  // Route through ongoing_agent_builder's execute endpoint
  // The runtime uses OpenRouter internally — no OpenAI key needed
  const runtimeResponse = await fetch(
    `${runtimeUrl}/api/v1/core/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(runtimeSecret
          ? { "X-Agent-Secret": runtimeSecret }
          : {}),
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
          systemPrompt: ONBOARDING_SYSTEM_PROMPT,
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

  // Forward the SSE stream directly
  return new Response(runtimeResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
