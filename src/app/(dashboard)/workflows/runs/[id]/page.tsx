"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import WorkflowsNav from "../../WorkflowsNav";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface RunStep {
  name: string;
  status: string;
  duration: number | null;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

interface WorkflowRunDetail {
  id: string;
  workflowId: string | null;
  workflowName: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  steps: RunStep[];
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const STATUS_COLORS: Record<string, string> = {
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  PENDING: "bg-yellow-100 text-yellow-700",
  SKIPPED: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
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

function formatDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Collapsible Section                                                */
/* ------------------------------------------------------------------ */
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {title}
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-[var(--bg-base)] border border-[var(--border)] rounded text-xs text-[var(--text-secondary)] overflow-x-auto max-h-48">
          {JSON.stringify(children, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function WorkflowRunDetailPage() {
  const params = useParams();
  const runId = params.id as string;

  const [run, setRun] = useState<WorkflowRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/workflows/runs", { headers });
      if (!res.ok) {
        setError("Failed to load run details");
        return;
      }
      const data = await res.json();
      const found = (data.runs ?? []).find((r: WorkflowRunDetail) => r.id === runId);
      if (!found) {
        setError("Run not found");
        return;
      }
      setRun(found);
    } catch {
      setError("Failed to load run details");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => { load(); }, [load]);

  return (
    <ModuleLayoutShell moduleType="WORKFLOWS">
      <div className="p-6 h-full flex flex-col bg-[var(--bg-base)]">
        <WorkflowsNav />

        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3" />
            <div className="h-4 bg-[var(--bg-surface)] rounded w-2/3" />
            <div className="space-y-3 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[var(--bg-surface)] rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{error}</h2>
              <Link href="/workflows/runs" className="text-sm text-[var(--accent)] hover:underline">
                Back to run history
              </Link>
            </div>
          </div>
        )}

        {run && !loading && (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Link href="/workflows/runs" className="text-sm text-[var(--accent)] hover:underline">
                  Run History
                </Link>
                <span className="text-[var(--text-tertiary)]">/</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{run.workflowName}</h1>
                <span
                  className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    STATUS_COLORS[run.status] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {run.status}
                </span>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] font-mono">Run ID: {run.id}</p>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Started</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(run.startedAt)}</p>
              </div>
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Ended</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{formatDate(run.endedAt)}</p>
              </div>
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Duration</p>
                <p className="text-sm font-medium text-[var(--text-primary)] font-mono">
                  {formatDuration(run.duration)}
                </p>
              </div>
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Steps</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{run.steps.length}</p>
              </div>
            </div>

            {/* Run-level error */}
            {run.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm font-semibold text-red-800 mb-1">Error</p>
                <p className="text-sm text-red-700 font-mono whitespace-pre-wrap">{run.error}</p>
              </div>
            )}

            {/* Step timeline */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Step Timeline</h2>
              {run.steps.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">No step data available</p>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--bg-surface)]" />

                  <div className="space-y-4">
                    {run.steps.map((step, idx) => (
                      <div key={idx} className="relative pl-10">
                        {/* Dot */}
                        <div
                          className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-white ${
                            step.status === "COMPLETED"
                              ? "bg-green-500"
                              : step.status === "FAILED"
                              ? "bg-red-500"
                              : step.status === "RUNNING"
                              ? "bg-blue-500"
                              : "bg-[var(--bg-hover)]"
                          }`}
                        />

                        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {step.name}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                                  STATUS_COLORS[step.status] || "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {step.status}
                              </span>
                            </div>
                            <span className="text-xs text-[var(--text-secondary)] font-mono">
                              {formatDuration(step.duration)}
                            </span>
                          </div>

                          {/* Step error */}
                          {step.error && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-mono">
                              {step.error}
                            </div>
                          )}

                          {/* Input / Output collapsibles */}
                          <div className="flex gap-4">
                            {step.input && Object.keys(step.input).length > 0 && (
                              <Collapsible title="Input">
                                {step.input as unknown as React.ReactNode}
                              </Collapsible>
                            )}
                            {step.output && Object.keys(step.output).length > 0 && (
                              <Collapsible title="Output">
                                {step.output as unknown as React.ReactNode}
                              </Collapsible>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
