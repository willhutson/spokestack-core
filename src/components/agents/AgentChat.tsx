"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, User, Paperclip, X, FileText, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/client-auth";
import {
  extractArtifactsFromResponse,
  stripArtifactBlocks,
} from "@/lib/mission-control/artifact-extraction";
import { ARTIFACT_CONFIG } from "@/lib/mission-control/constants";
import type { ArtifactType } from "@/lib/mission-control/types";

interface Message {
  role: "user" | "agent";
  content: string;
  artifacts?: ExtractedArtifact[];
}

interface ExtractedArtifact {
  id: string;
  type: string;
  title: string;
  data: unknown;
}

interface ChatAttachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
}

interface HandoffEvent {
  type: "handoff";
  target_agent: string;
  context_summary: string;
  reason: string;
}

interface AgentChatProps {
  agentType: string;
  placeholder?: string;
  initialMessage?: string;
  onComplete?: (messages: Message[]) => void;
  onArtifactClick?: (artifact: ExtractedArtifact) => void;
  onAgentSwitch?: (agentType: string) => void;
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain", "text/csv", "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function AgentChat({
  agentType,
  placeholder = "Type a message...",
  initialMessage,
  onComplete,
  onArtifactClick,
  onAgentSwitch,
  className,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingHandoff, setPendingHandoff] = useState<HandoffEvent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentInitial = useRef(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newAttachments: ChatAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) continue;
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      newAttachments.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = text ?? input.trim();
      if ((!messageText && attachments.length === 0) || isLoading) return;
      setInput("");
      setIsLoading(true);

      const attachmentNames = attachments.map((a) => a.name);
      const displayText = attachmentNames.length > 0
        ? `${messageText}\n\n📎 ${attachmentNames.join(", ")}`
        : messageText;

      const userMsg: Message = { role: "user", content: displayText };
      setMessages((prev) => [...prev, userMsg]);
      setAttachments([]);

      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/agents/chat", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            agentType,
            message: messageText,
            attachments: attachmentNames.length > 0 ? attachmentNames : undefined,
          }),
        });

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              role: "agent",
              content: "The agent is currently unavailable. You can still use all module features — the agent will be available once the runtime is online.",
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
          let sseBuffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream: true });

            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith("event:")) continue;

              if (trimmed.startsWith("data: ")) {
                const jsonStr = trimmed.slice(6);
                try {
                  const parsed = JSON.parse(jsonStr);

                  // Handoff detection
                  if (parsed.type === "handoff") {
                    setPendingHandoff(parsed as HandoffEvent);
                    continue;
                  }

                  // Artifact SSE event
                  if (parsed.type === "artifact" && parsed.data) {
                    // Will be extracted from final content
                    continue;
                  }

                  if (parsed.type === "message:stream" && parsed.text) {
                    agentContent += parsed.text;
                  } else if (parsed.type === "message:complete" && parsed.text) {
                    agentContent = parsed.text;
                  } else if (parsed.text) {
                    agentContent += parsed.text;
                  } else if (typeof parsed === "string") {
                    agentContent += parsed;
                  }
                } catch {
                  agentContent += jsonStr;
                }
              } else if (!trimmed.startsWith(":")) {
                agentContent += trimmed;
              }
            }

            setMessages((prev) => [
              ...prev.slice(0, -1),
              { role: "agent", content: agentContent },
            ]);
          }
        } else {
          const data = await res.json();
          agentContent = data.content || data.message || "";
        }

        // Extract artifacts from final content
        const artifacts = extractArtifactsFromResponse(agentContent);
        const cleanContent = artifacts.length > 0
          ? stripArtifactBlocks(agentContent)
          : agentContent;

        const finalMsg: Message = {
          role: "agent",
          content: cleanContent,
          artifacts: artifacts.length > 0 ? artifacts.map((a, idx) => ({
            id: `artifact-${Date.now()}-${idx}`,
            type: a.type,
            title: a.title ?? a.type,
            data: a.data,
          })) : undefined,
        };

        setMessages((prev) => [...prev.slice(0, -1), finalMsg]);

        onComplete?.([...messages, userMsg, finalMsg]);
      } catch (err) {
        const isNetworkError = err instanceof TypeError;
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
    [input, isLoading, agentType, messages, attachments, onComplete]
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
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
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "agent" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="max-w-[80%] space-y-2">
              <div
                className={cn(
                  "rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.content || (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Artifact chips */}
              {msg.artifacts && msg.artifacts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.artifacts.map((artifact) => {
                    const config = ARTIFACT_CONFIG[artifact.type as ArtifactType];
                    return (
                      <button
                        key={artifact.id}
                        onClick={() => onArtifactClick?.(artifact)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-indigo-300 transition-colors cursor-pointer"
                      >
                        <span>{config?.icon ?? "📄"}</span>
                        <span className="truncate max-w-[150px]">{artifact.title}</span>
                      </button>
                    );
                  })}
                </div>
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

      {/* Handoff prompt */}
      {pendingHandoff && (
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-indigo-800">
              <span className="font-medium">Switch to {pendingHandoff.target_agent.replace(/_/g, " ")}?</span>{" "}
              {pendingHandoff.reason}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onAgentSwitch?.(pendingHandoff.target_agent);
                setPendingHandoff(null);
              }}
              className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Switch
            </button>
            <button
              onClick={() => setPendingHandoff(null)}
              className="rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              Stay
            </button>
          </div>
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="px-3 pb-1 flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-100 rounded-md">
              {a.type.startsWith("image/") ? (
                <Image className="w-3 h-3 text-gray-500" />
              ) : (
                <FileText className="w-3 h-3 text-gray-500" />
              )}
              <span className="truncate max-w-[100px]">{a.name}</span>
              <button onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}>
                <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className={cn(
          "border-t p-3 transition-colors",
          isDragOver && "bg-indigo-50 border-indigo-300 border-dashed"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept={ALLOWED_TYPES.join(",")}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDragOver ? "Drop files here..." : placeholder}
            rows={1}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
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
