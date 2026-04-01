"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  status?: string;
  timestamp: string;
  href?: string;
  description?: string;
}

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const TYPE_COLORS: Record<string, string> = {
  TASK: "bg-blue-500/20 text-blue-300",
  PROJECT: "bg-purple-500/20 text-purple-300",
  BRIEF: "bg-amber-500/20 text-amber-300",
  ORDER: "bg-green-500/20 text-green-300",
  AGENT: "bg-indigo-500/20 text-indigo-300",
  SYSTEM: "bg-gray-500/20 text-gray-400",
};

function TypeBadge({ type }: { type: string }) {
  const style = TYPE_COLORS[type] ?? "bg-gray-500/20 text-gray-400";
  const label = type.charAt(0) + type.slice(1).toLowerCase();
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${style}`}>
      {label}
    </span>
  );
}

export default function MissionControlPage() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/activity?limit=30", { headers });
      if (!res.ok) throw new Error("Failed to fetch activity");
      const data = await res.json();
      setActivity(data.activity ?? data.items ?? []);
      setError(null);
    } catch (err) {
      console.error("Activity fetch error:", err);
      setError("Failed to load activity feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchActivity();
    intervalRef.current = setInterval(fetchActivity, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActivity]);

  // Status summary counts
  const typeCounts: Record<string, number> = {};
  for (const item of activity) {
    const t = item.type || "OTHER";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white">Mission Control</h1>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] font-medium text-green-400 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {activity.length} event{activity.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={fetchActivity}
            className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-white/5 rounded-md hover:bg-white/10 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Activity feed — main area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400">
              {error}
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-400 mb-1">No activity yet</p>
              <p className="text-xs text-gray-600 max-w-xs">
                Activity will appear here as you create tasks, projects, briefs, and orders. Your agents will keep this feed updated in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-lg p-4 transition-colors ${
                    item.href ? "cursor-pointer" : ""
                  }`}
                  onClick={() => {
                    if (item.href) window.location.href = item.href;
                  }}
                >
                  <div className="flex items-start gap-3">
                    <TypeBadge type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status && <StatusBadge status={item.status} size="sm" />}
                      <span className="text-[10px] text-gray-600 whitespace-nowrap">
                        {timeAgo(item.timestamp)}
                      </span>
                      {item.href && (
                        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status summary sidebar */}
        <div className="w-64 border-l border-white/5 p-4 overflow-y-auto">
          <h2 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-3">
            Summary
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : Object.keys(typeCounts).length === 0 ? (
            <p className="text-xs text-gray-600">No data</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(typeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between"
                  >
                    <TypeBadge type={type} />
                    <span className="text-lg font-bold text-gray-200">{count}</span>
                  </div>
                ))}
              <div className="border-t border-white/5 pt-2 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total</span>
                  <span className="text-sm font-semibold text-gray-300">{activity.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="mt-6">
            <h2 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-3">
              Feed Info
            </h2>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Polling interval</span>
                <span className="text-gray-400">30s</span>
              </div>
              <div className="flex justify-between">
                <span>Max items</span>
                <span className="text-gray-400">30</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
