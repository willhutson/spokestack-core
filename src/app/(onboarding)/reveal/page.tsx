"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Beat = "summary" | "agents" | "handoff";

interface AgentCard {
  name: string;
  role: string;
  description: string;
  active: boolean;
  tierName?: string;
  tierPrice?: string;
  alreadyKnows?: string[];
}

const AGENT_CARDS: AgentCard[] = [
  {
    name: "Tasks Agent",
    role: "Task Management",
    description: "Manages your tasks, assignments, and to-dos",
    active: true,
    alreadyKnows: [], // populated from context graph
  },
  {
    name: "Projects Agent",
    role: "Workflow Management",
    description: "Will manage your workflows, timelines, and milestones",
    active: false,
    tierName: "Starter",
    tierPrice: "$29/mo",
  },
  {
    name: "Briefs Agent",
    role: "Creative Management",
    description: "Will manage creative briefs, artifacts, and client deliverables",
    active: false,
    tierName: "Pro",
    tierPrice: "$59/mo",
  },
  {
    name: "Orders Agent",
    role: "Order Management",
    description: "Will manage orders, invoicing, and fulfillment",
    active: false,
    tierName: "Business",
    tierPrice: "$149/mo",
  },
];

export default function RevealPage() {
  const router = useRouter();
  const [beat, setBeat] = useState<Beat>("summary");
  const [visibleCards, setVisibleCards] = useState(0);
  const [contextKnowledge, setContextKnowledge] = useState<string[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    teams: 0,
    leads: 0,
    workflows: 0,
    integrations: 0,
  });

  // Load context from onboarding
  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch("/api/v1/onboarding/summary");
        if (res.ok) {
          const data = await res.json();
          setSummaryStats({
            teams: data.teams ?? 0,
            leads: data.leads ?? 0,
            workflows: data.workflows ?? 0,
            integrations: data.integrations ?? 0,
          });
          setContextKnowledge(data.contextEntries ?? []);
        }
      } catch {
        // Use defaults
      }
    }
    loadContext();
  }, []);

  // Beat 1 -> Beat 2 transition (2 seconds)
  useEffect(() => {
    if (beat === "summary") {
      const timer = setTimeout(() => setBeat("agents"), 2000);
      return () => clearTimeout(timer);
    }
  }, [beat]);

  // Stagger agent card appearance in Beat 2
  useEffect(() => {
    if (beat === "agents" && visibleCards < AGENT_CARDS.length) {
      const timer = setTimeout(() => {
        setVisibleCards((prev) => prev + 1);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [beat, visibleCards]);

  function handleStartWorking() {
    setBeat("handoff");
    // Animate out then navigate
    setTimeout(() => {
      router.push("/tasks");
    }, 800);
  }

  const statsLine = [
    summaryStats.teams > 0 ? `${summaryStats.teams} team${summaryStats.teams !== 1 ? "s" : ""}` : null,
    summaryStats.leads > 0 ? `${summaryStats.leads} lead${summaryStats.leads !== 1 ? "s" : ""}` : null,
    summaryStats.workflows > 0 ? `${summaryStats.workflows} workflow${summaryStats.workflows !== 1 ? "s" : ""}` : null,
    summaryStats.integrations > 0 ? `${summaryStats.integrations} integration${summaryStats.integrations !== 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" \u00B7 ");

  // Build agent cards with context knowledge injected into Tasks Agent
  const cards = AGENT_CARDS.map((card) => {
    if (card.name === "Tasks Agent" && contextKnowledge.length > 0) {
      return { ...card, alreadyKnows: contextKnowledge };
    }
    return card;
  });

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 transition-opacity duration-700 ${beat === "handoff" ? "opacity-0" : "opacity-100"}`}>
      <div className="w-full max-w-2xl mx-auto px-6">
        {/* Beat 1: Summary */}
        {beat === "summary" && (
          <div className="text-center animate-[fadeIn_0.6s_ease-out]">
            <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Workspace ready</h1>
              {statsLine && (
                <p className="text-sm text-gray-500 mb-6">{statsLine}</p>
              )}
              <p className="text-base text-gray-700 italic">
                &ldquo;Let me introduce your team.&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Beat 2: Agent Cards */}
        {beat === "agents" && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-center text-lg font-bold text-gray-900 mb-6">Your team</h2>
            <div className="grid grid-cols-2 gap-4">
              {cards.map((card, i) => {
                const isVisible = i < visibleCards;
                return (
                  <div
                    key={card.name}
                    className={`rounded-xl border p-5 transition-all duration-500 ${
                      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    } ${
                      card.active
                        ? "bg-white border-indigo-200 shadow-md"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* Status dot + name */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          card.active
                            ? "bg-indigo-600 border-indigo-600"
                            : "bg-transparent border-gray-300"
                        }`}
                      />
                      <h3
                        className={`text-sm font-semibold ${
                          card.active ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {card.name}
                      </h3>
                    </div>

                    <p
                      className={`text-xs mb-3 ${
                        card.active ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {card.description}
                    </p>

                    {/* Active card: Already knows + CTA */}
                    {card.active && (
                      <>
                        {card.alreadyKnows && card.alreadyKnows.length > 0 && (
                          <div className="mb-4">
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                              Already knows
                            </p>
                            <ul className="space-y-1">
                              {card.alreadyKnows.map((item, j) => (
                                <li key={j} className="text-xs text-gray-600 flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <button
                          onClick={handleStartWorking}
                          className="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Start working
                        </button>
                      </>
                    )}

                    {/* Gated card: tier info */}
                    {!card.active && (
                      <div className="mt-auto pt-2">
                        <p className="text-xs text-gray-400 mb-2">
                          {card.tierName} plan
                        </p>
                        <button className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
                          {card.tierPrice} &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
