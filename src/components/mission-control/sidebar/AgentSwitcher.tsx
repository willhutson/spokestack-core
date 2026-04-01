"use client";

import { AGENTS, QUICK_AGENTS } from "@/lib/mission-control/constants";
import { cn } from "@/lib/utils";

interface AgentSwitcherProps {
  onSelect: (agentType: string) => void;
}

export function AgentSwitcher({ onSelect }: AgentSwitcherProps) {
  return (
    <div className="px-3 py-2">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        Quick Agents
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_AGENTS.map((type) => {
          const agent = AGENTS[type];
          if (!agent) return null;
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-gray-800 px-3 py-2 text-left transition-colors",
                "hover:border-gray-600 hover:bg-gray-800/50",
              )}
            >
              <span className="text-base">{agent.icon}</span>
              <span className="truncate text-xs font-medium text-gray-300">{agent.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
