import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import { MCRouter } from "./router";
import { AgentExecutor } from "./executor";

const app = new Hono();

// ── Health Check ─────────────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ status: "ok", service: "spokestack-agent-runtime" })
);

// ── Auth middleware — validate shared secret ─────────────────────────────
app.use("/agent/*", async (c, next) => {
  const secret = c.req.header("X-Agent-Secret");
  if (secret !== process.env.AGENT_RUNTIME_SECRET) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});

// ── Agent Chat (SSE streaming) ───────────────────────────────────────────
app.post("/agent/chat", async (c) => {
  const { sessionId, message, orgId, userId, surface } = await c.req.json();

  if (!message || !orgId) {
    return c.json({ error: "message and orgId are required" }, 400);
  }

  return streamSSE(c, async (stream) => {
    const router = new MCRouter();
    const executor = new AgentExecutor();

    // Route to the appropriate agent
    const route = await router.route(message, orgId, sessionId);

    // Execute the agent turn, streaming chunks
    const chunks = executor.executeTurn({
      sessionId,
      message,
      orgId,
      userId,
      surface: surface ?? "WEB",
      agentType: route.agentType,
    });

    for await (const chunk of chunks) {
      await stream.writeSSE({ data: JSON.stringify(chunk) });
    }
  });
});

// ── Agent Ask (single response, no streaming) ────────────────────────────
app.post("/agent/ask", async (c) => {
  const { message, orgId, userId, surface } = await c.req.json();

  if (!message || !orgId) {
    return c.json({ error: "message and orgId are required" }, 400);
  }

  const router = new MCRouter();
  const executor = new AgentExecutor();

  const route = await router.route(message, orgId);

  // Collect all chunks into a single response
  const chunks: unknown[] = [];
  for await (const chunk of executor.executeTurn({
    message,
    orgId,
    userId,
    surface: surface ?? "CLI",
    agentType: route.agentType,
  })) {
    chunks.push(chunk);
  }

  const textChunks = chunks
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.content)
    .join("");

  return c.json({ response: textChunks, agentType: route.agentType });
});

// ── Agent Session management ─────────────────────────────────────────────
app.post("/agent/session", async (c) => {
  const { orgId, userId, agentType, surface } = await c.req.json();

  // TODO: Implement getOrCreateSession from 03a spec
  return c.json({
    sessionId: `session_${Date.now()}`,
    orgId,
    agentType,
    surface,
  });
});

// ── Telnyx Webhook (Ship 2 — WhatsApp) ──────────────────────────────────
app.post("/webhook/telnyx", async (c) => {
  // TODO: Ship 2 — validate Telnyx webhook signature, process WhatsApp messages
  return c.json({ status: "not_implemented" }, 501);
});

// ── Start Server ─────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? "3001", 10);

console.log(`SpokeStack Agent Runtime starting on port ${port}...`);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Agent Runtime running at http://localhost:${port}`);
});

export default app;
