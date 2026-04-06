"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MCMessage } from "@/lib/mission-control/types";
import type { AgentArtifact } from "@/lib/mission-control/agent-builder-client";
import { MC_API } from "@/lib/mission-control/constants";
import { getAuthHeaders } from "@/lib/client-auth";
import {
  extractArtifactsFromResponse,
  stripArtifactBlocks,
  toAgentArtifact,
} from "@/lib/mission-control/artifact-extraction";
import HandoffPrompt from "@/app/(dashboard)/components/handoff-prompt";
import type { HandoffEvent } from "@/app/(dashboard)/components/handoff-prompt";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import type { ChatAttachment } from "./ChatInput";
import { MCHomeView } from "../home/MCHomeView";

interface ChatPaneProps {
  chatId: string | null;
  agentType?: string;
  onCreateChat?: (agentType: string) => Promise<void>;
  onArtifactClick?: (artifact: AgentArtifact) => void;
}

export function ChatPane({ chatId, agentType, onCreateChat, onArtifactClick }: ChatPaneProps) {
  const [messages, setMessages] = useState<MCMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [pendingHandoff, setPendingHandoff] = useState<HandoffEvent | null>(null);
  const messageArtifactsRef = useRef<Map<string, AgentArtifact[]>>(new Map());

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
    async (content: string, attachments?: ChatAttachment[]) => {
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
        const payload: Record<string, unknown> = { content, role: "user" };
        if (attachments && attachments.length > 0) {
          payload.attachments = attachments.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            size: a.size,
          }));
        }
        const res = await fetch(MC_API.messages(chatId), {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

                    // Detect handoff events
                    if (parsed.type === "handoff") {
                      setPendingHandoff(parsed as HandoffEvent);
                      continue;
                    }

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
          // Extract artifacts from the response
          const extracted = extractArtifactsFromResponse(accumulated);
          const artifacts = extracted.map(toAgentArtifact);
          const displayContent = extracted.length > 0 ? stripArtifactBlocks(accumulated) : accumulated;

          const agentMsg: MCMessage = {
            id: `agent-${Date.now()}`,
            chatId,
            role: "agent",
            content: displayContent,
            agentType: agentType ?? null,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, agentMsg]);

          // Store artifacts in message metadata for rendering
          if (artifacts.length > 0) {
            messageArtifactsRef.current.set(agentMsg.id, artifacts);
          }
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
          messageArtifacts={messageArtifactsRef.current}
          onArtifactClick={onArtifactClick}
        />
      )}

      {pendingHandoff && (
        <HandoffPrompt
          handoff={pendingHandoff}
          onSwitch={(handoff) => {
            setPendingHandoff(null);
            onCreateChat?.(handoff.target_agent);
          }}
          onDismiss={() => setPendingHandoff(null)}
        />
      )}

      <ChatInput onSend={sendMessage} disabled={sending} />
    </div>
  );
}
