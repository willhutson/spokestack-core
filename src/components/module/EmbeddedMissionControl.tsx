"use client";

import { X } from "lucide-react";
import { AgentChat } from "@/components/agents/AgentChat";
import { cn } from "@/lib/utils";

interface EmbeddedMissionControlProps {
  isOpen: boolean;
  onClose: () => void;
  activeAgent: string | null;
  onSwitchAgent: (agentType: string) => void;
  availableAgents: string[];
}

export function EmbeddedMissionControl({
  isOpen,
  onClose,
  activeAgent,
  onSwitchAgent,
  availableAgents,
}: EmbeddedMissionControlProps) {
  return (
    <div
      className={cn(
        "border-l bg-background flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0",
        isOpen ? "w-[400px]" : "w-0"
      )}
      aria-hidden={!isOpen}
    >
      {isOpen && activeAgent && (
        <>
          <div className="h-12 flex items-center justify-between px-4 border-b shrink-0">
            {availableAgents.length > 1 ? (
              <select
                value={activeAgent}
                onChange={(e) => onSwitchAgent(e.target.value)}
                className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
              >
                {availableAgents.map((a) => (
                  <option key={a} value={a}>
                    {a.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium">Agent Chat</span>
            )}
            <div className="flex items-center gap-1">
              <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
                ⌘J
              </kbd>
              <button
                onClick={onClose}
                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <AgentChat
              agentType={activeAgent}
              className="h-full border-0 rounded-none"
            />
          </div>
        </>
      )}
    </div>
  );
}
