"use client";

import { useState, useEffect, useCallback } from "react";
import type { MCMessage } from "@/lib/mission-control/types";
import { MC_API } from "@/lib/mission-control/constants";
import { getAuthHeaders } from "@/lib/client-auth";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { MCHomeView } from "../home/MCHomeView";

interface ChatPaneProps {
  chatId: string | null;
  agentType?: string;
  onCreateChat?: (agentType: string) => Promise<void>;
}

export function ChatPane({ chatId, agentType, onCreateChat }: ChatPaneProps) {
  const [messages, setMessages] = useState<MCMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch(MC_API.messages(chatId), { headers });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data.messages ?? data ?? []);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    setMessages([]);
    setStreamingContent(null);
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!chatId || sending) return;
      setSending(true);
      setStreamingContent("");

      // Optimistic user message
      const userMsg: MCMessage = {
        id: `temp-${Date.now()}`,
        chatId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const headers = await getAuthHeaders();
        const res = await fetch(MC_API.messages(chatId), {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ content, role: "user" }),
        });

        if (!res.ok) throw new Error("Failed to send message");

        // Parse SSE stream
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        if (reader) {
          let done = false;
          while (!done) {
            const result = await reader.read();
            done = result.done;
            if (result.value) {
              const chunk = decoder.decode(result.value, { stream: true });
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const payload = line.slice(6).trim();
                  if (payload === "[DONE]") {
                    done = true;
                    break;
                  }
                  try {
                    const parsed = JSON.parse(payload);
                    // Server sends { text: "..." } in chunk events
                    const text = parsed.text ?? parsed.content ?? parsed.delta ?? "";
                    if (text) {
                      accumulated += text;
                      setStreamingContent(accumulated);
                    }
                    if (parsed.message) {
                      // Full message object returned (complete event)
                      setMessages((prev) => [...prev, parsed.message]);
                      accumulated = "";
                    }
                  } catch {
                    // Not JSON, treat as raw text
                    accumulated += payload;
                    setStreamingContent(accumulated);
                  }
                }
              }
            }
          }
        }

        // Finalize: add the streamed content as a message if not already added
        if (accumulated) {
          const agentMsg: MCMessage = {
            id: `agent-${Date.now()}`,
            chatId,
            role: "agent",
            content: accumulated,
            agentType: agentType ?? null,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, agentMsg]);
        }
      } catch {
        // Could show error toast
      } finally {
        setStreamingContent(null);
        setSending(false);
      }
    },
    [chatId, sending, agentType],
  );

  if (!chatId) {
    return <MCHomeView onCreateChat={onCreateChat} />;
  }

  return (
    <div className="flex h-full flex-col bg-gray-950">
      {loading && messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />
        </div>
      ) : (
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          streamingAgentType={agentType}
        />
      )}
      <ChatInput onSend={sendMessage} disabled={sending} />
    </div>
  );
}
