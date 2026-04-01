"use client";

import { AGENTS } from "@/lib/mission-control/constants";

interface MCHomeViewProps {
  onCreateChat?: (agentType: string) => Promise<void>;
}

const QUICK_ACTIONS = [
  { label: "Create a brief", agentType: "brief_writer", icon: "📝" },
  { label: "Start a project", agentType: "assistant", icon: "🚀" },
  { label: "Analyze data", agentType: "analyst", icon: "📊" },
  { label: "Plan content", agentType: "content_strategist", icon: "📋" },
];

export function MCHomeView({ onCreateChat }: MCHomeViewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-950 px-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-2 text-3xl font-bold text-white">Mission Control</h1>
        <p className="mb-8 text-gray-400">
          Start a conversation with any agent or pick a quick action below.
        </p>

        {/* Quick actions */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.agentType}
              onClick={() => onCreateChat?.(action.agentType)}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-5 transition-colors hover:border-indigo-500/50 hover:bg-gray-800"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-gray-300">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Agent cards */}
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Available Agents
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.values(AGENTS).map((agent) => (
            <button
              key={agent.type}
              onClick={() => onCreateChat?.(agent.type)}
              className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-3 text-left transition-colors hover:border-gray-600 hover:bg-gray-800/50"
            >
              <span className="text-lg">{agent.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-200">{agent.name}</p>
                <p className="truncate text-[11px] text-gray-500">{agent.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
