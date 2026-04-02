// Agent Builder Client — integration with ongoing_agent_builder runtime
// Communicates via HTTP/SSE with the agent runtime service.
// No Prisma queries — this is a pure HTTP client layer.

import type { AgentType } from "@/lib/agents/types";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const AGENT_RUNTIME_URL = process.env.AGENT_RUNTIME_URL ?? "http://localhost:8100";
const AGENT_RUNTIME_SECRET = process.env.AGENT_RUNTIME_SECRET ?? "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentExecutionRequest {
  agentType: AgentType;
  prompt: string;
  systemPrompt?: string;
  organizationId: string;
  userId?: string;
  sessionId?: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AgentExecutionResponse {
  content: string;
  agentType: AgentType;
  tokenCount?: number;
  artifacts?: AgentArtifact[];
  metadata?: Record<string, unknown>;
}

export interface AgentArtifact {
  id: string;
  type: string;
  title: string;
  data: unknown;
  version?: number;
}

export interface SSEChunk {
  event: string;
  data: string;
  id?: string;
}

export interface AgentModule {
  moduleType: string;
  name: string;
  active: boolean;
  installedAt: string;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  moduleType?: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: "user" | "agent" | "system";
  content: string;
  agentType?: AgentType;
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

function runtimeHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (AGENT_RUNTIME_SECRET) {
    headers["X-Agent-Secret"] = AGENT_RUNTIME_SECRET;
  }
  return headers;
}

async function runtimeFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${AGENT_RUNTIME_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...runtimeHeaders(), ...(options.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Agent runtime error: ${res.status} ${res.statusText} — ${body}`
    );
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Streaming execution
// ---------------------------------------------------------------------------

export type OnChunkCallback = (chunk: string, event: string) => void;
export type OnArtifactCallback = (artifact: AgentArtifact) => void;

export async function executeAgentStream(
  req: AgentExecutionRequest,
  onChunk: OnChunkCallback,
  onArtifact?: OnArtifactCallback
): Promise<AgentExecutionResponse> {
  const url = `${AGENT_RUNTIME_URL}/v1/agents/execute`;
  const res = await fetch(url, {
    method: "POST",
    headers: runtimeHeaders(),
    body: JSON.stringify({ ...req, stream: true }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Agent runtime stream error: ${res.status} — ${body}`);
  }

  if (!res.body) {
    throw new Error("Agent runtime returned no stream body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  const artifacts: AgentArtifact[] = [];
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim() || line.startsWith(":")) continue;

        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.event === "artifact" && parsed.artifact) {
              artifacts.push(parsed.artifact);
              onArtifact?.(parsed.artifact);
            } else if (parsed.event === "token" || parsed.content) {
              const text = parsed.content ?? parsed.token ?? "";
              fullContent += text;
              onChunk(text, parsed.event ?? "token");
            } else if (parsed.event === "error") {
              throw new Error(parsed.message ?? "Agent runtime stream error");
            }
          } catch (e) {
            // If not JSON, treat as raw text chunk
            if (!(e instanceof SyntaxError)) throw e;
            fullContent += data;
            onChunk(data, "token");
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    content: fullContent,
    agentType: req.agentType,
    artifacts,
  };
}

// ---------------------------------------------------------------------------
// Non-streaming execution
// ---------------------------------------------------------------------------

export async function executeAgent(
  req: AgentExecutionRequest
): Promise<AgentExecutionResponse> {
  return runtimeFetch<AgentExecutionResponse>("/v1/agents/execute", {
    method: "POST",
    body: JSON.stringify({ ...req, stream: false }),
  });
}

// ---------------------------------------------------------------------------
// Chat endpoint
// ---------------------------------------------------------------------------

export async function chatWithAgent(
  chatId: string,
  messages: ChatMessage[],
  agentType: AgentType,
  orgId: string
): Promise<AgentExecutionResponse> {
  return runtimeFetch<AgentExecutionResponse>("/v1/agents/chat", {
    method: "POST",
    body: JSON.stringify({
      chatId,
      messages,
      agentType,
      organizationId: orgId,
    }),
  });
}

// ---------------------------------------------------------------------------
// Module & skill discovery
// ---------------------------------------------------------------------------

export async function getModules(orgId: string): Promise<AgentModule[]> {
  return runtimeFetch<AgentModule[]>(`/v1/organizations/${orgId}/modules`);
}

export async function getModuleAgents(
  moduleType: string,
  orgId: string
): Promise<{ primaryAgent: string; secondaryAgents: string[] }> {
  return runtimeFetch(`/v1/organizations/${orgId}/modules/${moduleType}/agents`);
}

export async function getSkills(orgId: string): Promise<AgentSkill[]> {
  return runtimeFetch<AgentSkill[]>(`/v1/organizations/${orgId}/skills`);
}

export async function getKnowledgeDocuments(
  orgId: string
): Promise<KnowledgeDocument[]> {
  return runtimeFetch<KnowledgeDocument[]>(
    `/v1/organizations/${orgId}/knowledge`
  );
}

// ---------------------------------------------------------------------------
// Legacy ask endpoint (used by /api/v1/agents/ask)
// ---------------------------------------------------------------------------

export async function executeAgentAsk(payload: {
  message: string;
  orgId: string;
  userId: string;
  surface: string;
  metadata?: Record<string, unknown>;
}): Promise<Response> {
  const url = `${AGENT_RUNTIME_URL}/agent/ask`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(AGENT_RUNTIME_SECRET
        ? { "X-Agent-Secret": AGENT_RUNTIME_SECRET }
        : {}),
    },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function isAgentRuntimeAvailable(): Promise<boolean> {
  try {
    const url = `${AGENT_RUNTIME_URL}/health`;
    const res = await fetch(url, {
      method: "GET",
      headers: runtimeHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
