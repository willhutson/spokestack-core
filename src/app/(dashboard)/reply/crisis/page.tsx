"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { ReplyNav } from "../ReplyNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContextEntry {
  id: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
}

const PRE_APPROVED_TEMPLATES = [
  {
    name: "Acknowledgement",
    text: "We are aware of the issue and our team is actively working on a resolution. Thank you for your patience.",
  },
  {
    name: "Service Disruption",
    text: "We are currently experiencing service disruptions. Our team is working to restore normal operations as quickly as possible.",
  },
  {
    name: "Data Concern",
    text: "Your data security is our top priority. We are investigating this matter thoroughly and will provide updates as they become available.",
  },
  {
    name: "Escalation",
    text: "This matter has been escalated to our senior leadership team. We will follow up with you directly within 24 hours.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function CrisisPage() {
  const [crisisMode, setCrisisMode] = useState(false);
  const [items, setItems] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalationLog, setEscalationLog] = useState<
    { time: string; action: string }[]
  >([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/reply/inbox?type=flagged", { headers });
      if (res.ok) {
        const data = await res.json();
        const highUrgency = (data.entries ?? []).filter(
          (e: ContextEntry) => e.value.urgency === "high"
        );
        setItems(highUrgency);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleCrisisMode() {
    const next = !crisisMode;
    setCrisisMode(next);
    setEscalationLog((prev) => [
      {
        time: new Date().toISOString(),
        action: next ? "Crisis mode ACTIVATED" : "Crisis mode DEACTIVATED",
      },
      ...prev,
    ]);
  }

  function handleEscalate(item: ContextEntry) {
    setEscalationLog((prev) => [
      {
        time: new Date().toISOString(),
        action: `Escalated: "${item.key}" from ${(item.value.sender as string) || "unknown"}`,
      },
      ...prev,
    ]);
  }

  return (
    <ModuleLayoutShell moduleType="SOCIAL_PUBLISHING">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reply</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Crisis management and escalation controls.
          </p>
        </div>

        <ReplyNav />

        {/* Crisis Mode Banner */}
        {crisisMode && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm font-semibold text-red-700 flex-1">
              CRISIS MODE ACTIVE -- All high-urgency messages are prioritized.
              Pre-approved templates only.
            </p>
          </div>
        )}

        {/* Crisis Toggle */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Crisis Control
          </h2>
          <button
            onClick={toggleCrisisMode}
            className={cn(
              "px-6 py-2.5 text-sm font-bold rounded-lg transition-colors",
              crisisMode
                ? "bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-300"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            )}
          >
            {crisisMode ? "Deactivate Crisis Mode" : "Activate Crisis Mode"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Crisis Queue */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              High-Urgency Queue ({items.length})
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
                  >
                    <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-72 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">
                No high-urgency items in queue.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-red-200 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {(item.value.sender as string) || "Unknown"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            HIGH
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.key}</p>
                        <button
                          onClick={() => handleEscalate(item)}
                          className="mt-2 px-3 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Escalate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pre-approved Templates */}
            <h3 className="text-sm font-semibold text-gray-900 mt-6">
              Pre-Approved Response Templates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRE_APPROVED_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.name}
                  className="bg-white border border-gray-200 rounded-xl p-4"
                >
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    {tpl.name}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {tpl.text}
                  </p>
                  <button className="mt-2 px-3 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Escalation Log */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Escalation Log
            </h3>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {escalationLog.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-gray-400">
                  No escalations recorded.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {escalationLog.map((log, i) => (
                    <div key={i} className="px-4 py-3">
                      <p className="text-xs text-gray-400">
                        {new Date(log.time).toLocaleTimeString()}
                      </p>
                      <p className="text-sm text-gray-700">{log.action}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
