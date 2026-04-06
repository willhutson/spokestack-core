"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";
import StatusBadge from "@/components/shared/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContextEntry {
  id: string; key: string; value: string; category: string;
  metadata?: Record<string, unknown>; createdAt: string;
}
interface Project {
  id: string; name: string; status: string; description?: string;
  metadata?: Record<string, unknown>; createdAt: string;
}
interface Task {
  id: string; title: string; status: string; priority?: string;
  metadata?: Record<string, unknown>; createdAt: string; dueDate?: string;
}

type Tab = "influencers" | "campaigns" | "deliverables" | "roi";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "influencers", label: "Influencers" },
  { key: "campaigns", label: "Campaigns" },
  { key: "deliverables", label: "Deliverables" },
  { key: "roi", label: "ROI" },
];

const KANBAN_COLS = ["TODO", "IN_PROGRESS", "DONE"] as const;
const KANBAN_COLORS: Record<string, string> = {
  TODO: "bg-gray-50 border-gray-200",
  IN_PROGRESS: "bg-blue-50 border-blue-200",
  DONE: "bg-emerald-50 border-emerald-200",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtAED(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(v);
}

/* ------------------------------------------------------------------ */
/*  Add Influencer Form                                                */
/* ------------------------------------------------------------------ */
function AddInfluencerForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState(""); const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("Instagram"); const [followers, setFollowers] = useState("");
  const [rate, setRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required."); return; }
    setErr(null); setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/context", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "entity", category: "influencer", key: name.trim(),
          value: JSON.stringify({
            handle: handle.trim(), platform, followers: Number(followers) || 0,
            rateAED: Number(rate) || 0,
          }),
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
        <h2 className="text-sm font-semibold text-gray-900">Add Influencer</h2>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Influencer name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Handle</label>
            <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Instagram</option><option>TikTok</option><option>YouTube</option><option>X (Twitter)</option><option>LinkedIn</option>
            </select></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Followers</label>
            <input type="number" value={followers} onChange={e => setFollowers(e.target.value)} placeholder="0" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Rate (AED)</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {submitting ? "Adding..." : "Add Influencer"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function InfluencerMgmtPage() {
  const [tab, setTab] = useState<Tab>("influencers");
  const [influencers, setInfluencers] = useState<ContextEntry[]>([]);
  const [campaigns, setCampaigns] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [iRes, cRes, tRes] = await Promise.all([
        fetch("/api/v1/context?category=influencer", { headers }),
        fetch("/api/v1/projects", { headers }),
        fetch("/api/v1/tasks", { headers }),
      ]);
      if (iRes.ok) setInfluencers((await iRes.json()).entries ?? []);
      if (cRes.ok) {
        const data = await cRes.json();
        setCampaigns((data.projects ?? []).filter((p: Project) => p.metadata?.type === "influencer_campaign"));
      }
      if (tRes.ok) {
        const data = await tRes.json();
        setTasks((data.tasks ?? []).filter((t: Task) => t.metadata?.type === "deliverable"));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function parseVal(v: string): Record<string, unknown> {
    try { return JSON.parse(v); } catch { return {}; }
  }

  const roiData = useMemo(() => {
    const byPlatform: Record<string, { spend: number; reach: number }> = {};
    influencers.forEach(inf => {
      const d = parseVal(inf.value);
      const plat = (d.platform as string) || "Other";
      if (!byPlatform[plat]) byPlatform[plat] = { spend: 0, reach: 0 };
      byPlatform[plat].spend += Number(d.rateAED) || 0;
      byPlatform[plat].reach += Number(d.followers) || 0;
    });
    const totalSpend = Object.values(byPlatform).reduce((s, v) => s + v.spend, 0);
    const totalReach = Object.values(byPlatform).reduce((s, v) => s + v.reach, 0);
    const entries = Object.entries(byPlatform).sort((a, b) => b[1].spend - a[1].spend);
    const maxSpend = entries.length > 0 ? Math.max(...entries.map(e => e[1].spend)) : 1;
    return { totalSpend, totalReach, entries, maxSpend };
  }, [influencers]);

  const kanban = useMemo(() => {
    const map: Record<string, Task[]> = {};
    KANBAN_COLS.forEach(c => (map[c] = []));
    tasks.forEach(t => {
      const col = KANBAN_COLS.includes(t.status as typeof KANBAN_COLS[number]) ? t.status : "TODO";
      (map[col] ??= []).push(t);
    });
    return map;
  }, [tasks]);

  const Skeleton = () => (
    <div className="animate-pulse bg-white border border-gray-200 rounded-xl overflow-hidden">
      {[1, 2, 3].map(i => (
        <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
          <div className="h-4 w-32 bg-gray-200 rounded" /><div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-200 rounded-full ml-auto" />
        </div>
      ))}
    </div>
  );

  function fmtFollowers(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <ModuleLayoutShell moduleType="INFLUENCER_MGMT">
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Influencer Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage influencer partnerships, campaigns, and deliverables.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openChatWithContext("Help me plan an influencer marketing campaign.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Ask Agent</button>
          {tab === "influencers" && !showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Add Influencer</button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Influencers</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{influencers.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Campaigns</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{campaigns.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Spend</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{fmtAED(roiData.totalSpend)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Reach</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{fmtFollowers(roiData.totalReach)}</p>
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

      {showForm && tab === "influencers" && <AddInfluencerForm onCreated={() => { setShowForm(false); reload(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <Skeleton /> : (
        <>
          {/* Influencers */}
          {tab === "influencers" && (
            influencers.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No influencers yet</h3>
                <p className="text-xs text-gray-500 mb-4">Add influencer contacts to start managing partnerships.</p>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Add Influencer</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Handle</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Platform</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Followers</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Rate (AED)</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {influencers.map(inf => { const d = parseVal(inf.value); return (
                      <tr key={inf.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">{inf.key}</td>
                        <td className="px-5 py-4 text-sm text-indigo-600">{(d.handle as string) || "-"}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{(d.platform as string) || "-"}</td>
                        <td className="px-5 py-4 text-right text-sm text-gray-900">{fmtFollowers(Number(d.followers) || 0)}</td>
                        <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">{fmtAED(Number(d.rateAED) || 0)}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Campaigns */}
          {tab === "campaigns" && (
            campaigns.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No campaigns yet</h3>
                <p className="text-xs text-gray-500 mb-4">Create an influencer campaign to start tracking.</p>
                <button onClick={() => openChatWithContext("Create a new influencer marketing campaign.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">New Campaign</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map(c => (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">{c.name}</h3>
                      <StatusBadge status={c.status} />
                    </div>
                    {c.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{c.description}</p>}
                    <p className="text-xs text-gray-400">{fmtDate(c.createdAt)}</p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Deliverables Kanban */}
          {tab === "deliverables" && (
            tasks.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No deliverables yet</h3>
                <p className="text-xs text-gray-500 mb-4">Track influencer deliverables and content submissions.</p>
                <button onClick={() => openChatWithContext("Help me set up influencer deliverable tracking.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Add Deliverable</button>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {KANBAN_COLS.map(col => (
                  <div key={col} className={`min-w-[240px] flex-1 rounded-xl border p-3 ${KANBAN_COLORS[col]}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{col.replace(/_/g, " ")}</h3>
                      <span className="text-xs text-gray-500 font-medium">{kanban[col]?.length ?? 0}</span>
                    </div>
                    <div className="space-y-2">
                      {(kanban[col] ?? []).map(t => (
                        <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                          <h4 className="text-xs font-medium text-gray-900 mb-1">{t.title}</h4>
                          {t.dueDate && <p className="text-xs text-gray-400">Due {fmtDate(t.dueDate)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ROI */}
          {tab === "roi" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Investment</p>
                  <p className="text-2xl font-bold text-gray-900">{fmtAED(roiData.totalSpend)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Reach</p>
                  <p className="text-2xl font-bold text-blue-600">{fmtFollowers(roiData.totalReach)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500 mb-1">Cost per Reach</p>
                  <p className="text-2xl font-bold text-gray-900">{roiData.totalReach > 0 ? fmtAED(roiData.totalSpend / roiData.totalReach) : "AED 0.00"}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Spend by Platform</h3>
                {roiData.entries.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">No influencer data available yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roiData.entries.map(([platform, data]) => (
                      <div key={platform}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{platform}</span>
                          <span className="text-sm font-medium text-gray-900">{fmtAED(data.spend)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div className="bg-indigo-500 h-3 rounded-full transition-all" style={{ width: `${(data.spend / roiData.maxSpend) * 100}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtFollowers(data.reach)} reach</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
