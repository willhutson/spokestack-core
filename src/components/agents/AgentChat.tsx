"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/client-auth";

interface Message {
  role: "user" | "agent";
  content: string;
}

interface AgentChatProps {
  agentType: string;
  placeholder?: string;
  initialMessage?: string;
  onComplete?: (messages: Message[]) => void;
  className?: string;
}

export function AgentChat({
  agentType,
  placeholder = "Type a message...",
  initialMessage,
  onComplete,
  className,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentInitial = useRef(false);

  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = text ?? input.trim();
      if (!messageText || isLoading) return;
      setInput("");
      setIsLoading(true);

      const userMsg: Message = { role: "user", content: messageText };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/agents/chat", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ agentType, message: messageText }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = (errData as Record<string, string>).error || `Error ${res.status}`;
          setMessages((prev) => [
            ...prev,
            {
              role: "agent",
              content: `The agent is currently unavailable. This usually means the agent runtime isn't connected yet.\n\nYou can still use all module features — the agent will be available once the runtime is online.`,
            },
          ]);
          setIsLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let agentContent = "";

        setMessages((prev) => [...prev, { role: "agent", content: "" }]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            agentContent += chunk;
            setMessages((prev) => [
              ...prev.slice(0, -1),
              { role: "agent", content: agentContent },
            ]);
          }
        } else {
          const data = await res.json();
          agentContent = data.content || data.message || "";
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "agent", content: agentContent },
          ]);
        }

        onComplete?.([
          ...messages,
          userMsg,
          { role: "agent", content: agentContent },
        ]);
      } catch (err) {
        const isNetworkError = err instanceof TypeError && (err as TypeError).message.includes("fetch");
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            content: isNetworkError
              ? "Could not reach the agent runtime. The agent will be available once the runtime is online."
              : "Something went wrong. Please try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, isLoading, agentType, messages, onComplete]
  );

  useEffect(() => {
    if (initialMessage && !sentInitial.current) {
      sentInitial.current = true;
      handleSend(initialMessage);
    }
  }, [initialMessage, handleSend]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">How can I help?</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "agent" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {msg.content || (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="shrink-0 h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
