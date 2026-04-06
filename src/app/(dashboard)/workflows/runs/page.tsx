"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import WorkflowsNav from "../WorkflowsNav";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface WorkflowRun {
  id: string;
  workflowId: string | null;
  workflowName: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  error: string | null;
}

type StatusFilter = "ALL" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

const STATUSES: StatusFilter[] = ["ALL", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "--";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function WorkflowRunsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workflowIdParam = searchParams.get("workflowId");

  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (workflowIdParam) params.set("workflowId", workflowIdParam);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const qs = params.toString();
      const res = await fetch(`/api/v1/workflows/runs${qs ? `?${qs}` : ""}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [workflowIdParam, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <ModuleLayoutShell moduleType="WORKFLOWS">
      <div className="p-6 h-full flex flex-col bg-white">
        <WorkflowsNav />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Run History</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {runs.length} run{runs.length !== 1 ? "s" : ""}
              {workflowIdParam ? " for this workflow" : ""}
            </p>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-6">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No runs found</h2>
            <p className="text-sm text-gray-500 max-w-md">
              {statusFilter !== "ALL"
                ? `No ${statusFilter.toLowerCase()} runs. Try a different filter.`
                : "Workflow runs will appear here once workflows are executed."}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="pb-3 pr-4">Workflow</th>
                  <th className="pb-3 pr-4">Started At</th>
                  <th className="pb-3 pr-4">Duration</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => router.push(`/workflows/runs/${run.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-gray-900">
                        {run.workflowName}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(run.startedAt)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-gray-600 font-mono">
                        {formatDuration(run.duration)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          STATUS_COLORS[run.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
