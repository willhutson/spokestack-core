"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ToolAudit, { type ToolAuditEntry } from "@/components/onboarding/ToolAudit";
import MigrationPlan from "@/components/onboarding/MigrationPlan";
import { TOOL_MODULE_MAP } from "@/lib/onboarding/tool-module-map";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
}

interface WorkspacePreview {
  teams: { name: string; memberCount: number }[];
  workflows: { name: string; steps: string[] }[];
  integrations: string[];
  leads: string[];
}

export default function OnboardingConversationPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "agent",
      content: "Welcome to SpokeStack. What does your company do?",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspacePreview>({
    teams: [],
    workflows: [],
    integrations: [],
    leads: [],
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audit + migration step state
  const [step, setStep] = useState<"conversation" | "audit" | "migration" | "done">("conversation");
  const [auditEntries, setAuditEntries] = useState<ToolAuditEntry[]>([]);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [isInstallingModules, setIsInstallingModules] = useState(false);

  // Check for Supabase session on mount — redirect to signup if none
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/signup");
      } else {
        setAccessToken(session.access_token);
      }
    });
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/v1/agents/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          context: "onboarding",
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      const agentMsgId = `agent-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: agentMsgId, role: "agent", content: "" },
      ]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  done = true;
                  break;
                }
                try {
                  const parsed = JSON.parse(data);

                  // Handle workspace preview updates
                  if (parsed.workspace) {
                    setWorkspace((prev) => ({
                      teams: parsed.workspace.teams ?? prev.teams,
                      workflows: parsed.workspace.workflows ?? prev.workflows,
                      integrations: parsed.workspace.integrations ?? prev.integrations,
                      leads: parsed.workspace.leads ?? prev.leads,
                    }));
                  }

                  // Handle transition to audit (was: reveal)
                  if (parsed.action === "reveal") {
                    setTimeout(() => setStep("audit"), 1500);
                  }

                  const token = parsed.token || parsed.content || "";
                  if (token) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === agentMsgId ? { ...m, content: m.content + token } : m
                      )
                    );
                  }
                } catch {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === agentMsgId ? { ...m, content: m.content + data } : m
                    )
                  );
                }
              }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "agent",
          content: "Something went wrong. Let me try again — what does your company do?",
        },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  const totalEntities = workspace.teams.length + workspace.workflows.length + workspace.integrations.length + workspace.leads.length;

  // ── Audit submission handler ─────────────────────────────────────
  const handleAuditSubmit = async (entries: ToolAuditEntry[]) => {
    setIsSubmittingAudit(true);
    try {
      // Save each entry to context graph
      if (accessToken) {
        await Promise.all(
          entries.map((entry) => {
            const moduleId =
              TOOL_MODULE_MAP[entry.currentTool.trim().toLowerCase()] ?? null;
            return fetch("/api/v1/context", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                entryType: "ENTITY",
                category: "onboarding.tool_audit",
                key: entry.categoryId,
                value: {
                  currentTool: entry.currentTool,
                  dataVolume: entry.dataVolume || null,
                  painPoints: entry.painPoints || null,
                  replacementModule: moduleId,
                },
                confidence: 1.0,
              }),
            });
          })
        );
      }
      setAuditEntries(entries);
      setStep("migration");
    } catch (err) {
      console.error("Failed to save audit:", err);
      setAuditEntries(entries);
      setStep("migration");
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  // ── Module install handler ───────────────────────────────────────
  const handleInstallModules = async (moduleTypes: string[]) => {
    setIsInstallingModules(true);
    try {
      if (moduleTypes.length > 0 && accessToken) {
        await fetch("/api/v1/modules/install-batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ moduleTypes }),
        });
      }
    } catch (err) {
      console.error("Module install failed:", err);
    } finally {
      setIsInstallingModules(false);
      setStep("done");
      router.push("/reveal");
    }
  };

  // ── Audit / Migration step renders ───────────────────────────────
  if (step === "audit") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <ToolAudit
            onSubmit={handleAuditSubmit}
            isSubmitting={isSubmittingAudit}
          />
        </div>
      </div>
    );
  }

  if (step === "migration") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <MigrationPlan
            entries={auditEntries}
            onInstallModules={handleInstallModules}
            isInstalling={isInstallingModules}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left: Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="h-14 px-6 flex items-center border-b border-gray-200">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2.5">
            S
          </div>
          <span className="font-semibold text-sm text-gray-900">SpokeStack Setup</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="flex items-start gap-3 max-w-[75%]">
                {msg.role === "agent" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0 mt-0.5">
                    S
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {msg.content || (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your response..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Right: Workspace preview */}
      <div className="w-96 bg-gray-50 border-l border-gray-200 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-gray-900">Workspace Preview</h2>
            {totalEntities > 0 && (
              <span className="text-xs text-gray-400">{totalEntities} entities</span>
            )}
          </div>

          {totalEntities === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <p className="text-xs text-gray-400">
                Your workspace will appear here as you tell us about your business.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Teams */}
              {workspace.teams.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Teams</h3>
                  <div className="space-y-1.5">
                    {workspace.teams.map((team, i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between animate-[fadeIn_0.4s_ease-out]"
                        style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                      >
                        <span className="text-sm text-gray-900">{team.name}</span>
                        <span className="text-xs text-gray-400">{team.memberCount} members</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads */}
              {workspace.leads.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Key People</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {workspace.leads.map((lead, i) => (
                      <span
                        key={i}
                        className="bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-700 animate-[fadeIn_0.4s_ease-out]"
                        style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                      >
                        {lead}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflows */}
              {workspace.workflows.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Workflows</h3>
                  <div className="space-y-2">
                    {workspace.workflows.map((wf, i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-200 rounded-lg p-3 animate-[fadeIn_0.4s_ease-out]"
                        style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
                      >
                        <p className="text-sm font-medium text-gray-900 mb-1.5">{wf.name}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {wf.steps.map((step, j) => (
                            <span key={j} className="flex items-center gap-1">
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                                {step}
                              </span>
                              {j < wf.steps.length - 1 && (
                                <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Integrations */}
              {workspace.integrations.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Integrations</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {workspace.integrations.map((int, i) => (
                      <span
                        key={i}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 flex items-center gap-1.5 animate-[fadeIn_0.4s_ease-out]"
                        style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        {int}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
