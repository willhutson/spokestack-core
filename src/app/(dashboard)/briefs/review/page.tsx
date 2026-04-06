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

export default function BriefsReviewPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [commentId, setCommentId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const loadBriefs = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", { headers });
      if (res.ok) {
        const data = await res.json();
        const all: Brief[] = data.briefs ?? data ?? [];
        setBriefs(all.filter((b) => b.status === "IN_REVIEW"));
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

  async function patchBrief(id: string, body: Record<string, unknown>) {
    setActionId(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/briefs/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setBriefs((prev) => prev.filter((b) => b.id !== id));
        setCommentId(null);
        setComment("");
      }
    } catch {
      /* ignore */
    } finally {
      setActionId(null);
    }
  }

  function daysInReview(updatedAt: string) {
    const diff = Date.now() - new Date(updatedAt).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
      <div className="p-6">
        <BriefsNav />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Review</h1>
          <p className="text-sm text-gray-500 mt-1">
            Briefs currently in review awaiting approval or feedback
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Loading briefs...</div>
          </div>
        ) : briefs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">No briefs in review</h3>
            <p className="text-xs text-gray-500">
              Briefs accepted during triage will appear here for final review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {briefs.map((brief) => {
              const meta = (brief.metadata ?? {}) as Record<string, unknown>;
              const briefType = meta.type as string | undefined;
              const days = daysInReview(brief.updatedAt);

              return (
                <div key={brief.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{brief.title}</h3>
                        {briefType && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700">
                            {briefType}
                          </span>
                        )}
                      </div>
                      {brief.description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{brief.description}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {days === 0 ? "In review since today" : `In review for ${days} day${days !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>

                  {/* Request changes comment */}
                  {commentId === brief.id && (
                    <div className="mt-3">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="What changes are needed?"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      disabled={actionId === brief.id}
                      onClick={() => patchBrief(brief.id, { status: "ACTIVE" })}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    {commentId === brief.id ? (
                      <>
                        <button
                          disabled={actionId === brief.id}
                          onClick={() =>
                            patchBrief(brief.id, {
                              status: "DRAFT",
                              metadata: { ...meta, reviewComment: comment },
                            })
                          }
                          className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                        >
                          Submit Changes
                        </button>
                        <button
                          onClick={() => { setCommentId(null); setComment(""); }}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={actionId === brief.id}
                        onClick={() => setCommentId(brief.id)}
                        className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                      >
                        Request Changes
                      </button>
                    )}
                    <button
                      disabled={actionId === brief.id}
                      onClick={() => patchBrief(brief.id, { status: "ARCHIVED" })}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
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
