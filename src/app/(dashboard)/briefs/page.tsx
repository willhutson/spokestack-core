"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { BriefsNav } from "./BriefsNav";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/shared/StatusBadge";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

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
  DRAFT: "border-[var(--border-strong)] bg-[var(--bg-base)]",
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
      <BriefsNav />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Briefs</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage creative briefs, artifacts, and client reviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openChatWithContext("Summarize my active briefs and their review status")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            Ask Agent
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            + New Brief
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase">Total Briefs</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{totalBriefs}</p>
        </div>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase">In Review</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{inReview}</p>
        </div>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase">Completed This Month</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completedThisMonth}</p>
        </div>
      </div>

      {/* Inline Create Form */}
      {showForm && (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">New Brief</h2>
            <button onClick={() => setShowForm(false)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              Cancel
            </button>
          </div>
          <form onSubmit={handleCreateBrief} className="space-y-3">
            <input
              type="text"
              placeholder="Brief title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <textarea
              placeholder="Description (optional)"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <select
              value={formClient}
              onChange={(e) => setFormClient(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
              className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating..." : "Create Brief"}
            </button>
          </form>
        </div>
      )}

      {/* Pipeline Kanban */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-[var(--text-tertiary)]">Loading briefs...</div>
        </div>
      ) : briefs.length === 0 ? (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No briefs yet</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">Create your first brief to start managing creative deliverables.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            Create Brief
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={async (result: DropResult) => {
          const { draggableId, destination } = result;
          if (!destination) return;
          const newStatus = destination.droppableId;
          updateBriefStatus(draggableId, newStatus);
        }}>
        <div className="grid grid-cols-4 gap-4">
          {PIPELINE_COLUMNS.map((col) => (
            <Droppable droppableId={col} key={col}>
              {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`rounded-xl border-2 p-3 min-h-[300px] transition-colors ${COLUMN_COLORS[col]} ${snapshot.isDraggingOver ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                  {col.replace(/_/g, " ")}
                </h3>
                <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-base)] rounded-full px-2 py-0.5">
                  {buckets[col].length}
                </span>
              </div>
              <div className="space-y-3">
                {buckets[col].map((brief, index) => {
                  const phases = brief.phases ?? [];
                  const completedPhases = phases.filter(
                    (p) => p.status === "COMPLETED" || p.status === "completed"
                  ).length;
                  const totalPhases = phases.length;

                  return (
                    <Draggable key={brief.id} draggableId={brief.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={`bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-3 hover:shadow-md transition-shadow cursor-grab ${dragSnapshot.isDragging ? "shadow-lg ring-2 ring-[var(--accent)]" : ""}`}
                    >
                      <div onClick={() => router.push(`/briefs/${brief.id}`)}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">{brief.title}</h4>
                          <StatusBadge status={brief.status} />
                        </div>
                        {brief.clientName && (
                          <p className="text-xs text-[var(--text-secondary)] mb-1">{brief.clientName}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                          {totalPhases > 0 && <span>{completedPhases}/{totalPhases} phases</span>}
                          {(brief.artifactCount ?? 0) > 0 && (
                            <span>{brief.artifactCount} artifact{brief.artifactCount !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>

                      {/* Status transition buttons */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {col === "DRAFT" && (
                          <button
                            disabled={updating === brief.id}
                            onClick={(e) => { e.stopPropagation(); updateBriefStatus(brief.id, "ACTIVE"); }}
                            className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
                          >
                            → Activate
                          </button>
                        )}
                        {col === "ACTIVE" && (
                          <>
                            <button
                              disabled={updating === brief.id}
                              onClick={(e) => { e.stopPropagation(); updateBriefStatus(brief.id, "IN_REVIEW"); }}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 disabled:opacity-50 transition-colors"
                            >
                              → Submit for Review
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openChatWithContext(`Generate an artifact for brief: ${brief.title}`); }}
                              className="px-2 py-1 text-xs font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              Generate Artifact
                            </button>
                          </>
                        )}
                        {col === "IN_REVIEW" && (
                          <>
                            <button
                              disabled={updating === brief.id}
                              onClick={(e) => { e.stopPropagation(); updateBriefStatus(brief.id, "COMPLETED"); }}
                              className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              disabled={updating === brief.id}
                              onClick={(e) => { e.stopPropagation(); updateBriefStatus(brief.id, "ACTIVE"); }}
                              className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded hover:bg-amber-100 disabled:opacity-50 transition-colors"
                            >
                              ← Revisions
                            </button>
                          </>
                        )}
                        {col === "COMPLETED" && (
                          <button
                            disabled={updating === brief.id}
                            onClick={(e) => { e.stopPropagation(); updateBriefStatus(brief.id, "ACTIVE"); }}
                            className="px-2 py-1 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-colors"
                          >
                            ← Reopen
                          </button>
                        )}
                      </div>
                    </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            </div>
              )}
            </Droppable>
          ))}
        </div>
        </DragDropContext>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
