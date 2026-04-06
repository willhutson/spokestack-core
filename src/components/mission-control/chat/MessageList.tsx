"use client";

import { useEffect, useRef } from "react";
import type { MCMessage } from "@/lib/mission-control/types";
import type { AgentArtifact } from "@/lib/mission-control/agent-builder-client";
import { AGENTS } from "@/lib/mission-control/constants";
import {
  extractArtifactsFromResponse,
  stripArtifactBlocks,
  toAgentArtifact,
} from "@/lib/mission-control/artifact-extraction";
import { cn } from "@/lib/utils";
import { ArtifactChip } from "../artifacts/ArtifactChip";

interface MessageListProps {
  messages: MCMessage[];
  streamingContent?: string | null;
  streamingAgentType?: string | null;
  messageArtifacts?: Map<string, AgentArtifact[]>;
  onArtifactClick?: (artifact: AgentArtifact) => void;
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

export function MessageList({ messages, streamingContent, streamingAgentType, messageArtifacts, onArtifactClick }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((msg) => {
        const isUser = msg.role === "user";
        const agent = msg.agentType ? AGENTS[msg.agentType] : null;

        // Check for artifacts in agent messages
        const precomputedArtifacts = messageArtifacts?.get(msg.id);
        let artifacts: AgentArtifact[] | undefined;
        let displayContent = msg.content;

        if (!isUser && msg.role !== "system") {
          if (precomputedArtifacts && precomputedArtifacts.length > 0) {
            artifacts = precomputedArtifacts;
            displayContent = stripArtifactBlocks(msg.content);
          } else {
            const extracted = extractArtifactsFromResponse(msg.content);
            if (extracted.length > 0) {
              artifacts = extracted.map(toAgentArtifact);
              displayContent = stripArtifactBlocks(msg.content);
            }
          }
        }

        return (
          <div
            key={msg.id}
            className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
          >
            {!isUser && (
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
                  agent ? `bg-gradient-to-br ${agent.color} text-white` : "bg-gray-700 text-gray-300",
                )}
              >
                {agent?.icon ?? "🤖"}
              </div>
            )}
            <div className="max-w-[70%]">
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  isUser
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-gray-800 text-gray-100 rounded-bl-md",
                )}
              >
                {msg.role === "system" ? (
                  <p className="text-xs text-gray-400 italic">{displayContent}</p>
                ) : (
                  <div className="whitespace-pre-wrap">{displayContent}</div>
                )}
                <p className={cn("mt-1 text-[10px]", isUser ? "text-indigo-300" : "text-gray-500")}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
              {artifacts && artifacts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {artifacts.map((artifact) => (
                    <ArtifactChip
                      key={artifact.id}
                      artifact={artifact}
                      onClick={() => onArtifactClick?.(artifact)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {streamingContent !== undefined && streamingContent !== null && (
        <div className="flex gap-3 justify-start">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
              streamingAgentType && AGENTS[streamingAgentType]
                ? `bg-gradient-to-br ${AGENTS[streamingAgentType].color} text-white`
                : "bg-gray-700 text-gray-300",
            )}
          >
            {(streamingAgentType && AGENTS[streamingAgentType]?.icon) ?? "🤖"}
          </div>
          <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-gray-800 px-4 py-3 text-sm leading-relaxed text-gray-100">
            {streamingContent ? (
              <div className="whitespace-pre-wrap">{streamingContent}</div>
            ) : (
              <TypingDots />
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
