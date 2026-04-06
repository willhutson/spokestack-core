"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import WorkflowsNav from "../WorkflowsNav";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface WfCanvasNode {
  id: string;
  type: string;
  label: string;
  positionX: number;
  positionY: number;
  config: Record<string, unknown> | null;
}

interface WfCanvasEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition: Record<string, unknown> | null;
}

interface WfCanvas {
  id: string;
  projectId: string | null;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  nodes: WfCanvasNode[];
  edges: WfCanvasEdge[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const NODE_ICONS: Record<string, string> = {
  START: "\u25B6",
  END: "\u23F9",
  ACTION: "\u26A1",
  CONDITION: "\u2753",
  DELAY: "\u23F3",
  APPROVAL: "\u2705",
  NOTIFICATION: "\uD83D\uDD14",
};

function configSummary(config: Record<string, unknown> | null): string {
  if (!config) return "No configuration";
  const keys = Object.keys(config);
  if (keys.length === 0) return "No configuration";
  return keys.slice(0, 3).map((k) => `${k}: ${String(config[k])}`).join(", ");
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [canvas, setCanvas] = useState<WfCanvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/workflows/${id}`, { headers });
      if (!res.ok) {
        setError(res.status === 404 ? "Workflow not found" : "Failed to load workflow");
        return;
      }
      const data = await res.json();
      setCanvas(data.canvas);
    } catch {
      setError("Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    setDeleting(true);
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/v1/workflows/${id}`, {
        method: "DELETE",
        headers,
      });
      router.push("/workflows");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <ModuleLayoutShell moduleType="WORKFLOWS">
      <div className="p-6 h-full flex flex-col bg-[var(--bg-base)]">
        <WorkflowsNav />

        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3" />
            <div className="h-4 bg-[var(--bg-surface)] rounded w-2/3" />
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-[var(--bg-surface)] rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{error}</h2>
              <Link href="/workflows" className="text-sm text-[var(--accent)] hover:underline">
                Back to workflows
              </Link>
            </div>
          </div>
        )}

        {canvas && !loading && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">{canvas.name}</h1>
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    Active
                  </span>
                </div>
                {canvas.description && (
                  <p className="text-sm text-[var(--text-secondary)]">{canvas.description}</p>
                )}
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Created {new Date(canvas.createdAt).toLocaleDateString()} ·
                  Updated {new Date(canvas.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const h = await getAuthHeaders();
                    await fetch(`/api/v1/canvas/${id}/run`, { method: "POST", headers: { ...h, "Content-Type": "application/json" } });
                    window.location.reload();
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent)] transition-colors"
                >
                  Run Now
                </button>
                <button
                  onClick={() => router.push(`/workflows?edit=${id}`)}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-base)] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-[var(--bg-surface)] border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Nodes</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{canvas.nodes.length}</p>
              </div>
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Edges</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{canvas.edges.length}</p>
              </div>
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Total Runs</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">0</p>
              </div>
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">&mdash;</p>
              </div>
            </div>

            {/* Run history link */}
            <div className="mb-6">
              <Link
                href={`/workflows/runs?workflowId=${canvas.id}`}
                className="text-sm text-[var(--accent)] hover:underline font-medium"
              >
                View run history for this workflow &rarr;
              </Link>
            </div>

            {/* Node list */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Nodes ({canvas.nodes.length})
              </h2>
              <div className="space-y-2">
                {canvas.nodes
                  .sort((a, b) => a.positionY - b.positionY || a.positionX - b.positionX)
                  .map((node, idx) => (
                    <div
                      key={node.id}
                      className="flex items-center gap-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--border-strong)] transition-colors"
                    >
                      <span className="flex-shrink-0 w-8 h-8 bg-[var(--bg-surface)] rounded-lg flex items-center justify-center text-base">
                        {NODE_ICONS[node.type] || "\u2B24"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-[var(--text-tertiary)] font-mono">#{idx + 1}</span>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{node.label}</span>
                          <span className="px-1.5 py-0.5 text-xs rounded bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                            {node.type}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {configSummary(node.config)}
                        </p>
                      </div>
                    </div>
                  ))}
                {canvas.nodes.length === 0 && (
                  <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">No nodes in this workflow</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
