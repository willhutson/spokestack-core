"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ── Types ─────────────────────────────────────────────────────────── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ContextItem {
  type: "workflow" | "entity" | "integration";
  label: string;
  href?: string;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

/** Strip <action>…</action> blocks from visible text, return them separately. */
function extractActions(raw: string): {
  display: string;
  actions: { name: string; payload: string }[];
} {
  const actions: { name: string; payload: string }[] = [];
  const display = raw.replace(
    /<action\s+name="([^"]+)">([\s\S]*?)<\/action>/g,
    (_, name, payload) => {
      actions.push({ name, payload: payload.trim() });
      return "";
    },
  );
  return { display: display.trim(), actions };
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function MagicOnboardingPage() {
  const router = useRouter();

  /* Auth */
  const [accessToken, setAccessToken] = useState<string | null>(null);

  /* Chat */
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey there! I\u2019m your SpokeStack setup assistant. Tell me a bit about your business and what you\u2019re looking to accomplish \u2014 I\u2019ll get everything ready for you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  /* Context panel */
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Auth bootstrap ──────────────────────────────────────────────── */
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

  /* ── Auto-scroll ─────────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Auto-resize textarea ────────────────────────────────────────── */
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  }, [input]);

  /* ── Execute action from agent ───────────────────────────────────── */
  const executeAction = useCallback(
    async (name: string, payload: string) => {
      if (name === "COMPLETE_ONBOARDING") {
        await fetch("/api/v1/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ complete: true }),
        });
        setTimeout(() => router.push("/tasks"), 1500);
        return;
      }

      try {
        const res = await fetch("/api/v1/onboarding/action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ action: name, payload }),
        });

        if (res.ok) {
          const data = await res.json();

          /* Build context panel items from the response */
          if (data.entity) {
            setContextItems((prev) => [
              ...prev,
              {
                type: "entity",
                label: data.entity.name || name,
                href: data.entity.href,
              },
            ]);
          }
          if (data.workflow) {
            setContextItems((prev) => [
              ...prev,
              {
                type: "workflow",
                label: data.workflow.name || "Workflow",
                href: data.workflow.href,
              },
            ]);
          }
          if (data.integration) {
            setContextItems((prev) => [
              ...prev,
              {
                type: "integration",
                label: data.integration.name || "Integration",
              },
            ]);
          }
        }
      } catch {
        /* fail silently — the conversation can continue */
      }
    },
    [accessToken, router],
  );

  /* ── Send message ────────────────────────────────────────────────── */
  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/v1/onboarding/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          messages: history.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

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
                const payload = line.slice(6);
                if (payload === "[DONE]") {
                  done = true;
                  break;
                }
                try {
                  const parsed = JSON.parse(payload);
                  const token = parsed.text || "";
                  if (token) {
                    fullText += token;
                    const { display } = extractActions(fullText);
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: display }
                          : m,
                      ),
                    );
                  }
                } catch {
                  /* ignore malformed JSON lines */
                }
              }
            }
          }
        }
      }

      /* Process actions after stream completes */
      const { actions, display } = extractActions(fullText);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: display } : m,
        ),
      );
      for (const action of actions) {
        await executeAction(action.name, action.payload);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Sorry, something went wrong on my end. Could you try again?",
              }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  /* ── Skip onboarding ─────────────────────────────────────────────── */
  async function handleSkip() {
    await fetch("/api/v1/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ complete: true }),
    });
    router.push("/tasks");
  }

  /* ── Key handler ─────────────────────────────────────────────────── */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  const hasContext = contextItems.length > 0;

  return (
    <div className="flex h-screen bg-gray-950">
      {/* ── Left: Chat area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex h-14 items-center justify-between px-6 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              S
            </div>
            <span className="text-sm font-semibold text-white">SpokeStack</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Skip for now&nbsp;&rarr;
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="flex items-start gap-3 max-w-[75%]">
                {msg.role === "assistant" && (
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    S
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-900 border border-gray-800 text-gray-100"
                  }`}
                >
                  {msg.content || (
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:0.3s]" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {/* Up arrow */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Context panel ────────────────────────────────────── */}
      {hasContext && (
        <aside className="w-[272px] shrink-0 overflow-y-auto border-l border-gray-800 bg-gray-950 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Your Setup
          </h2>

          {/* Workflows */}
          {contextItems.filter((c) => c.type === "workflow").length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                Workflows
              </h3>
              <div className="space-y-1.5">
                {contextItems
                  .filter((c) => c.type === "workflow")
                  .map((item, i) => (
                    <ContextCard key={`wf-${i}`} item={item} />
                  ))}
              </div>
            </div>
          )}

          {/* Created entities */}
          {contextItems.filter((c) => c.type === "entity").length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                Created
              </h3>
              <div className="space-y-1.5">
                {contextItems
                  .filter((c) => c.type === "entity")
                  .map((item, i) => (
                    <ContextCard key={`ent-${i}`} item={item} />
                  ))}
              </div>
            </div>
          )}

          {/* Integrations */}
          {contextItems.filter((c) => c.type === "integration").length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                Integrations
              </h3>
              <div className="space-y-1.5">
                {contextItems
                  .filter((c) => c.type === "integration")
                  .map((item, i) => (
                    <ContextCard key={`int-${i}`} item={item} />
                  ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

/* ── Context card sub-component ──────────────────────────────────── */

function ContextCard({ item }: { item: ContextItem }) {
  const inner = (
    <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 transition-colors hover:border-gray-700">
      {item.type === "integration" && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
      )}
      {item.type === "workflow" && (
        <svg
          className="h-3.5 w-3.5 shrink-0 text-indigo-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )}
      {item.type === "entity" && (
        <svg
          className="h-3.5 w-3.5 shrink-0 text-indigo-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
      <span className="truncate">{item.label}</span>
    </div>
  );

  if (item.href) {
    return (
      <a href={item.href} className="block">
        {inner}
      </a>
    );
  }
  return inner;
}
