"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/shared/StatusBadge";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Brief {
  id: string;
  title: string;
  description?: string;
  status: string;
  clientName?: string;
  clientId?: string;
  phases?: { id: string; name: string; status: string }[];
  artifactCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
}

const PIPELINE_COLUMNS = ["DRAFT", "ACTIVE", "IN_REVIEW", "COMPLETED"] as const;
const COLUMN_COLORS: Record<string, string> = {
  DRAFT: "border-gray-300 bg-gray-50",
  ACTIVE: "border-blue-300 bg-blue-50",
  IN_REVIEW: "border-purple-300 bg-purple-50",
  COMPLETED: "border-emerald-300 bg-emerald-50",
};

export default function BriefsPage() {
  const router = useRouter();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // New brief form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadBriefs = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", { headers });
      if (res.ok) {
        const data = await res.json();
        setBriefs(data.briefs ?? data ?? []);
      }
    } catch {
      /* API not available */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/clients", { headers });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients ?? data ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadBriefs();
    loadClients();
  }, [loadBriefs, loadClients]);

  async function updateBriefStatus(id: string, newStatus: string) {
    setUpdating(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/briefs/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setBriefs((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
        );
      }
    } catch {
      /* ignore */
    } finally {
      setUpdating(null);
    }
  }

  async function handleCreateBrief(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formTitle.trim()) {
      setFormError("Title is required.");
      return;
    }
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          clientId: formClient || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        setFormError(body || res.statusText);
        return;
      }
      setFormTitle("");
      setFormDesc("");
      setFormClient("");
      setShowForm(false);
      setLoading(true);
      loadBriefs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  // Stats
  const totalBriefs = briefs.length;
  const inReview = briefs.filter((b) => b.status === "IN_REVIEW").length;
  const now = new Date();
  const completedThisMonth = briefs.filter((b) => {
    if (b.status !== "COMPLETED") return false;
    const d = new Date(b.updatedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Bucket briefs by status
  const buckets: Record<string, Brief[]> = { DRAFT: [], ACTIVE: [], IN_REVIEW: [], COMPLETED: [] };
  briefs.forEach((b) => {
    const key = PIPELINE_COLUMNS.includes(b.status as typeof PIPELINE_COLUMNS[number])
      ? b.status
      : "DRAFT";
    buckets[key].push(b);
  });

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Briefs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage creative briefs, artifacts, and client reviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openChatWithContext("Summarize my active briefs and their review status")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Ask Agent
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Brief
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Briefs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalBriefs}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">In Review</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{inReview}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Completed This Month</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completedThisMonth}</p>
        </div>
      </div>

      {/* Inline Create Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">New Brief</h2>
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
          <form onSubmit={handleCreateBrief} className="space-y-3">
            <input
              type="text"
              placeholder="Brief title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={formClient}
              onChange={(e) => setFormClient(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select client (optional)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating..." : "Create Brief"}
            </button>
          </form>
        </div>
      )}

      {/* Pipeline Kanban */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-400">Loading briefs...</div>
        </div>
      ) : briefs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-1">No briefs yet</h3>
          <p className="text-xs text-gray-500 mb-4">Create your first brief to start managing creative deliverables.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Create Brief
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {PIPELINE_COLUMNS.map((col) => (
            <div key={col} className={`rounded-xl border-2 p-3 min-h-[300px] ${COLUMN_COLORS[col]}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {col.replace(/_/g, " ")}
                </h3>
                <span className="text-xs font-medium text-gray-500 bg-white rounded-full px-2 py-0.5">
                  {buckets[col].length}
                </span>
              </div>
              <div className="space-y-3">
                {buckets[col].map((brief) => {
                  const phases = brief.phases ?? [];
                  const completedPhases = phases.filter(
                    (p) => p.status === "COMPLETED" || p.status === "completed"
                  ).length;
                  const totalPhases = phases.length;

                  return (
                    <div
                      key={brief.id}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div onClick={() => router.push(`/briefs/${brief.id}`)}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">{brief.title}</h4>
                          <StatusBadge status={brief.status} />
                        </div>
                        {brief.clientName && (
                          <p className="text-xs text-gray-500 mb-1">{brief.clientName}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {totalPhases > 0 && <span>{completedPhases}/{totalPhases} phases</span>}
                          {(brief.artifactCount ?? 0) > 0 && (
                            <span>{brief.artifactCount} artifact{brief.artifactCount !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {col === "IN_REVIEW" && (
                          <>
                            <button
                              disabled={updating === brief.id}
                              onClick={(e) => { e.stopPropagation(); updateBriefStatus(brief.id, "COMPLETED"); }}
                              className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              disabled={updating === brief.id}
                              onClick={(e) => { e.stopPropagation(); updateBriefStatus(brief.id, "DRAFT"); }}
                              className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded hover:bg-amber-100 disabled:opacity-50 transition-colors"
                            >
                              Request Revisions
                            </button>
                          </>
                        )}
                        {col === "ACTIVE" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openChatWithContext(`Generate an artifact for brief: ${brief.title}`);
                            }}
                            className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                          >
                            Generate Artifact
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
