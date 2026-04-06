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
  CANCELLED: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
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
      <div className="p-6 h-full flex flex-col bg-[var(--bg-base)]">
        <WorkflowsNav />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Run History</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
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
                  ? "bg-[var(--accent)] text-[var(--primary-foreground)]"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
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
              <div key={i} className="h-12 bg-[var(--bg-surface)] rounded-lg" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[var(--bg-surface)] rounded-full flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-[var(--text-tertiary)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No runs found</h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-md">
              {statusFilter !== "ALL"
                ? `No ${statusFilter.toLowerCase()} runs. Try a different filter.`
                : "Workflow runs will appear here once workflows are executed."}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border)]">
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
                    className="border-b border-[var(--border)] hover:bg-[var(--bg-base)] cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {run.workflowName}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {formatDate(run.startedAt)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-[var(--text-secondary)] font-mono">
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
