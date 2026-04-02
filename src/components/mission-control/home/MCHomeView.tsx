"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS } from "@/lib/mission-control/constants";
import { getAuthHeaders } from "@/lib/client-auth";

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
  const router = useRouter();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    async function check() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/onboarding", { headers });
        if (res.ok) {
          const data = await res.json();
          setOnboardingComplete(data.onboardingComplete ?? false);
        }
      } catch {
        setOnboardingComplete(true); // Don't block on error
      }
    }
    check();
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-950 px-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-2 text-3xl font-bold text-white">
          Mission Control
        </h1>
        <p className="mb-6 text-gray-400">
          Start a conversation with any agent or pick a quick action below.
        </p>

        {/* Onboarding nudge */}
        {onboardingComplete === false && (
          <div className="mb-8 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5 text-left">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚀</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">
                  Finish setting up your workspace
                </h3>
                <p className="mt-1 text-sm text-indigo-200/70">
                  Your onboarding isn&apos;t complete yet. Talk to the
                  Onboarding Agent to set up your team, logo, colors, and
                  modules — or run through the setup wizard.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onCreateChat?.("onboarding")}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
                  >
                    Talk to Onboarding Agent
                  </button>
                  <button
                    onClick={() => router.push("/admin/onboarding")}
                    className="rounded-lg border border-indigo-500/30 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                  >
                    Setup Wizard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.agentType}
              onClick={() => onCreateChat?.(action.agentType)}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-5 transition-colors hover:border-indigo-500/50 hover:bg-gray-800"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-gray-300">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Agent cards */}
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Available Agents
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.values(AGENTS)
            .filter((a) => a.type !== "onboarding")
            .map((agent) => (
              <button
                key={agent.type}
                onClick={() => onCreateChat?.(agent.type)}
                className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-3 text-left transition-colors hover:border-gray-600 hover:bg-gray-800/50"
              >
                <span className="text-lg">{agent.icon}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-200">
                    {agent.name}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    {agent.description}
                  </p>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
