"use client";

import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  createdAt: string;
}

function SkeletonLine({ width }: { width: string }) {
  return <div className={`animate-pulse h-3 bg-gray-200 rounded ${width}`} />;
}

export default function NPSPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/clients", { headers });
        if (res.ok) {
          const data = await res.json();
          setClients(data.clients ?? []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NPS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Net Promoter Score tracking</p>
        </div>
        <button
          onClick={() => openChatWithContext("Help me create an NPS survey for my clients")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Survey
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* NPS Gauge */}
        <section className="flex items-center gap-8">
          <div className="flex-shrink-0">
            <div className="w-36 h-36 rounded-full border-8 border-gray-200 flex items-center justify-center relative">
              <div className="text-center">
                <span className="text-4xl font-bold text-gray-300">&mdash;</span>
                <p className="text-xs text-gray-400 mt-1">NPS Score</p>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No survey data yet</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Net Promoter Score measures customer satisfaction on a scale of -100 to 100.
              Create a survey to start tracking how likely your clients are to recommend you.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs text-gray-500">Promoters (9-10)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="text-xs text-gray-500">Passives (7-8)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-xs text-gray-500">Detractors (0-6)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Client list preview */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Potential Survey Recipients
            </h2>
            <span className="text-xs text-gray-400">
              {loading ? "..." : `${clients.length} client${clients.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {loading ? (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 space-y-2">
                  <SkeletonLine width="w-1/4" />
                  <SkeletonLine width="w-1/3" />
                </div>
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">No clients found</p>
              <p className="text-xs text-gray-400">Add clients to send NPS surveys.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {clients.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-semibold text-indigo-600">
                    {c.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {c.email ?? c.company ?? "No contact info"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    Added {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {clients.length > 5 && (
                <div className="px-4 py-3 text-center">
                  <span className="text-xs text-gray-400">
                    + {clients.length - 5} more client{clients.length - 5 !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Explanation */}
        <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm text-indigo-800">
            Net Promoter Score measures customer satisfaction. Create a survey to start tracking.
            The agent can help you design questions, select recipients, and schedule send times.
          </p>
        </section>
      </div>
    </div>
  );
}
