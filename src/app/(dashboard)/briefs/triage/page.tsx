"use client";
import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { BriefsNav } from "../BriefsNav";
import { getAuthHeaders } from "@/lib/client-auth";

interface Brief {
  id: string;
  title: string;
  description?: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function BriefsTriagePage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const loadBriefs = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", { headers });
      if (res.ok) {
        const data = await res.json();
        const all: Brief[] = data.briefs ?? data ?? [];
        // Filter: DRAFT status with a metadata.type (submitted via typed form)
        setBriefs(
          all.filter(
            (b) => b.status === "DRAFT" && b.metadata && typeof (b.metadata as Record<string, unknown>).type === "string"
          )
        );
      }
    } catch {
      /* API not available */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  async function handleAccept(id: string) {
    setActionId(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/briefs/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_REVIEW" }),
      });
      if (res.ok) {
        setBriefs((prev) => prev.filter((b) => b.id !== id));
      }
    } catch {
      /* ignore */
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    setActionId(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/briefs/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ARCHIVED",
          metadata: { rejectionNote: rejectionNote || "Rejected during triage" },
        }),
      });
      if (res.ok) {
        setBriefs((prev) => prev.filter((b) => b.id !== id));
        setRejectingId(null);
        setRejectionNote("");
      }
    } catch {
      /* ignore */
    } finally {
      setActionId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
      <div className="p-6">
        <BriefsNav />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Triage</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review incoming briefs and decide whether to accept or reject them
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Loading briefs...</div>
          </div>
        ) : briefs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No briefs awaiting triage</h3>
            <p className="text-xs text-gray-500">
              New briefs submitted through the creation form will appear here for review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {briefs.map((brief) => {
              const meta = (brief.metadata ?? {}) as Record<string, unknown>;
              const aiSummary = meta.aiSummary as string | undefined;
              const briefType = meta.type as string | undefined;

              return (
                <div key={brief.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{brief.title}</h3>
                        {briefType && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
                            {briefType}
                          </span>
                        )}
                      </div>
                      {brief.description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{brief.description}</p>
                      )}
                      <p className="text-xs text-gray-400">Submitted {formatDate(brief.createdAt)}</p>
                    </div>
                  </div>

                  {/* AI Analysis Panel */}
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 mb-1">AI Analysis</p>
                    <p className="text-xs text-gray-500">
                      {aiSummary || "Analysis pending..."}
                    </p>
                  </div>

                  {/* Rejection note input */}
                  {rejectingId === brief.id && (
                    <div className="mt-3">
                      <textarea
                        value={rejectionNote}
                        onChange={(e) => setRejectionNote(e.target.value)}
                        placeholder="Reason for rejection (optional)"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      disabled={actionId === brief.id}
                      onClick={() => handleAccept(brief.id)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                      Accept
                    </button>
                    {rejectingId === brief.id ? (
                      <>
                        <button
                          disabled={actionId === brief.id}
                          onClick={() => handleReject(brief.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectionNote(""); }}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={actionId === brief.id}
                        onClick={() => setRejectingId(brief.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
