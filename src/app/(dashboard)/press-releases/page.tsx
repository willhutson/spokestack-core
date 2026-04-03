"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";
import StatusBadge from "@/components/shared/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Brief {
  id: string; title: string; status: string; content?: string;
  metadata?: Record<string, unknown>; createdAt: string; updatedAt?: string;
}
interface ContextEntry {
  id: string; key: string; value: string; category: string;
  metadata?: Record<string, unknown>; createdAt: string;
}

type Tab = "drafts" | "approvals" | "distribution" | "archive";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "drafts", label: "Drafts" },
  { key: "approvals", label: "Approvals" },
  { key: "distribution", label: "Distribution" },
  { key: "archive", label: "Archive" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Create Press Release Form                                          */
/* ------------------------------------------------------------------ */
function CreatePRForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(""); const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setErr("Title is required."); return; }
    setErr(null); setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), content: content.trim() || undefined,
          status: "DRAFT", metadata: { type: "press_release" },
        }),
      });
      if (!res.ok) { setErr(`Failed: ${(await res.text()) || res.statusText}`); return; }
      onCreated();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Unexpected error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">New Press Release</h2>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Press release headline" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Press release body..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" /></div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {submitting ? "Creating..." : "Create Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function PressReleasesPage() {
  const [tab, setTab] = useState<Tab>("drafts");
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [distribution, setDistribution] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [bRes, dRes] = await Promise.all([
        fetch("/api/v1/briefs", { headers }),
        fetch("/api/v1/context?category=pr_distribution", { headers }),
      ]);
      if (bRes.ok) {
        const data = await bRes.json();
        setBriefs((data.briefs ?? []).filter((b: Brief) => b.metadata?.type === "press_release"));
      }
      if (dRes.ok) setDistribution((await dRes.json()).entries ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const drafts = briefs.filter(b => b.status === "DRAFT");
  const approvals = briefs.filter(b => b.status === "IN_REVIEW");
  const archived = briefs.filter(b => b.status === "COMPLETED" || b.status === "APPROVED");

  async function updateStatus(id: string, status: string) {
    setActionLoading(id);
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/v1/briefs/${id}`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      reload();
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  }

  const Skeleton = () => (
    <div className="animate-pulse bg-white border border-gray-200 rounded-xl overflow-hidden">
      {[1, 2, 3].map(i => (
        <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
          <div className="h-4 w-48 bg-gray-200 rounded" /><div className="h-5 w-16 bg-gray-200 rounded-full" />
          <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
        </div>
      ))}
    </div>
  );

  function parseVal(v: string): Record<string, unknown> {
    try { return JSON.parse(v); } catch { return {}; }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Press Releases</h1>
          <p className="text-sm text-gray-500 mt-0.5">Draft, approve, and distribute press releases.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openChatWithContext("Help me draft a press release.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Ask Agent</button>
          {tab === "drafts" && !showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">New Release</button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Drafts</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{drafts.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Pending Approval</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{approvals.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Distributed</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{distribution.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Archived</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{archived.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TAB_LABELS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {showForm && tab === "drafts" && <CreatePRForm onCreated={() => { setShowForm(false); reload(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <Skeleton /> : (
        <>
          {/* Drafts */}
          {tab === "drafts" && (
            drafts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No drafts</h3>
                <p className="text-xs text-gray-500 mb-4">Start a new press release draft.</p>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">New Release</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Created</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {drafts.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">{d.title}</td>
                        <td className="px-5 py-4"><StatusBadge status={d.status} /></td>
                        <td className="px-5 py-4 text-right text-xs text-gray-500">{fmtDate(d.createdAt)}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => updateStatus(d.id, "IN_REVIEW")} disabled={actionLoading === d.id} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
                            Submit for Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Approvals */}
          {tab === "approvals" && (
            approvals.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No pending approvals</h3>
                <p className="text-xs text-gray-500">Press releases submitted for review will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvals.map(a => (
                  <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Submitted {fmtDate(a.updatedAt || a.createdAt)}</p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    {a.content && <p className="text-sm text-gray-600 mb-4 line-clamp-3">{a.content}</p>}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <button onClick={() => updateStatus(a.id, "APPROVED")} disabled={actionLoading === a.id} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                        Approve
                      </button>
                      <button onClick={() => updateStatus(a.id, "DRAFT")} disabled={actionLoading === a.id} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
                        Revise
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Distribution */}
          {tab === "distribution" && (
            distribution.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No distributions yet</h3>
                <p className="text-xs text-gray-500 mb-4">Track where your press releases have been sent.</p>
                <button onClick={() => openChatWithContext("Help me set up press release distribution channels.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Set Up Distribution</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Release</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Channel</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Recipients</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Sent</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {distribution.map(d => { const v = parseVal(d.value); return (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">{d.key}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{(v.channel as string) || "-"}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{(v.recipients as number) || 0}</td>
                        <td className="px-5 py-4 text-right text-xs text-gray-500">{fmtDate(d.createdAt)}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Archive */}
          {tab === "archive" && (
            archived.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No archived releases</h3>
                <p className="text-xs text-gray-500">Approved and completed press releases will appear here.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {archived.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">{a.title}</td>
                        <td className="px-5 py-4"><StatusBadge status={a.status} /></td>
                        <td className="px-5 py-4 text-right text-xs text-gray-500">{fmtDate(a.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
