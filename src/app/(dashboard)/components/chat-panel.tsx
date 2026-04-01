"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

export default function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "agent",
      content: "I'm your Tasks Agent. I know your team and workflows. What's first?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    // Handle /switch command
    if (text.startsWith("/switch ")) {
      const agent = text.replace("/switch ", "").trim();
      setMessages((prev) => [
        ...prev,
        {
          id: `switch-${Date.now()}`,
          role: "agent",
          content: `Switching to ${agent} Agent...`,
          timestamp: new Date(),
        },
      ]);
      setStreaming(false);
      return;
    }

    // Stream response from agent via SSE
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const res = await fetch("/api/v1/agents/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const agentMsgId = `agent-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: agentMsgId, role: "agent", content: "", timestamp: new Date() },
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
            // Parse SSE data lines
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  const token = parsed.token || parsed.content || "";
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === agentMsgId ? { ...m, content: m.content + token } : m
                    )
                  );
                } catch {
                  // Plain text token
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
          content: "Sorry, I couldn't process that. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-gray-900">Tasks Agent</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.content}
              {msg.role === "agent" && streaming && msg.content === "" && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3">
        <p className="text-[10px] text-gray-400 mb-1.5">Type /switch [agent] to change agents</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message your agent..."
            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
