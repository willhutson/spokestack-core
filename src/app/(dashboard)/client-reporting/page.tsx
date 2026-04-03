"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";
import StatusBadge from "@/components/shared/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Brief {
  id: string; title: string; status: string; content?: string;
  metadata?: Record<string, unknown>; createdAt: string;
}
interface ContextEntry {
  id: string; key: string; value: string; category: string;
  metadata?: Record<string, unknown>; createdAt: string;
}

type Tab = "reports" | "metrics" | "templates";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "reports", label: "Reports" },
  { key: "metrics", label: "Metrics" },
  { key: "templates", label: "Templates" },
];

const REPORT_TEMPLATES = [
  { title: "Monthly PR Report", description: "Comprehensive overview of media coverage, AVE, sentiment analysis, and key placements for the month.", fields: ["Coverage Summary", "AVE Breakdown", "Sentiment Analysis", "Top Placements"] },
  { title: "Campaign Report", description: "End-to-end campaign performance report including reach, engagement, media hits, and ROI metrics.", fields: ["Campaign Overview", "Media Hits", "Social Reach", "ROI Analysis"] },
  { title: "Quarterly Business Review", description: "Strategic review covering client goals, deliverables, KPI performance, and upcoming recommendations.", fields: ["Goal Progress", "KPI Dashboard", "Deliverable Status", "Recommendations"] },
  { title: "Crisis Post-Mortem", description: "Detailed analysis of crisis response including timeline, stakeholder feedback, media impact, and lessons learned.", fields: ["Incident Timeline", "Response Effectiveness", "Media Impact", "Lessons Learned"] },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtAED(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(v);
}

/* ------------------------------------------------------------------ */
/*  Create Report Form                                                 */
/* ------------------------------------------------------------------ */
function CreateReportForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(""); const [period, setPeriod] = useState("");
  const [clientName, setClientName] = useState("");
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
          title: title.trim(), status: "DRAFT",
          metadata: { type: "report", period: period.trim(), clientName: clientName.trim() },
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
        <h2 className="text-sm font-semibold text-gray-900">New Report</h2>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Report title" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
            <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. March 2026" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {submitting ? "Creating..." : "Create Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ClientReportingPage() {
  const [tab, setTab] = useState<Tab>("reports");
  const [reports, setReports] = useState<Brief[]>([]);
  const [coverage, setCoverage] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [bRes, cRes] = await Promise.all([
        fetch("/api/v1/briefs", { headers }),
        fetch("/api/v1/context?category=coverage", { headers }),
      ]);
      if (bRes.ok) {
        const data = await bRes.json();
        setReports((data.briefs ?? []).filter((b: Brief) => b.metadata?.type === "report"));
      }
      if (cRes.ok) setCoverage((await cRes.json()).entries ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const metrics = useMemo(() => {
    let totalAVE = 0; let totalHits = coverage.length;
    const outletMap: Record<string, number> = {};
    coverage.forEach(c => {
      try {
        const v = JSON.parse(c.value);
        totalAVE += Number(v.ave) || 0;
        const outlet = (v.outlet as string) || "Other";
        outletMap[outlet] = (outletMap[outlet] || 0) + 1;
      } catch { /* skip */ }
    });
    const topOutlets = Object.entries(outletMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxHits = topOutlets.length > 0 ? topOutlets[0][1] : 1;
    return { totalAVE, totalHits, topOutlets, maxHits };
  }, [coverage]);

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Reporting</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate reports, track metrics, and measure campaign performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openChatWithContext("Help me build a client report with coverage metrics and AVE data.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Ask Agent</button>
          {tab === "reports" && !showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">New Report</button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Reports</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{reports.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Coverage Hits</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{metrics.totalHits}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total AVE</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{fmtAED(metrics.totalAVE)}</p>
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

      {showForm && tab === "reports" && <CreateReportForm onCreated={() => { setShowForm(false); reload(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <Skeleton /> : (
        <>
          {/* Reports */}
          {tab === "reports" && (
            reports.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No reports yet</h3>
                <p className="text-xs text-gray-500 mb-4">Create your first client report.</p>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">New Report</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Period</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Created</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {reports.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">{r.title}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{(r.metadata?.clientName as string) || "-"}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{(r.metadata?.period as string) || "-"}</td>
                        <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                        <td className="px-5 py-4 text-right text-xs text-gray-500">{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Metrics */}
          {tab === "metrics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Coverage Hits</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalHits}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500 mb-1">Advertising Value Equivalent</p>
                  <p className="text-2xl font-bold text-emerald-600">{fmtAED(metrics.totalAVE)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500 mb-1">Share of Voice</p>
                  <p className="text-2xl font-bold text-blue-600">{metrics.totalHits > 0 ? "100%" : "0%"}</p>
                  <p className="text-xs text-gray-400 mt-1">Based on tracked coverage</p>
                </div>
              </div>

              {/* SOV Bar Chart */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Coverage by Outlet</h3>
                {metrics.topOutlets.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">No coverage data available yet.</p>
                    <button onClick={() => openChatWithContext("Help me log media coverage to track metrics.")} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2">Log Coverage</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metrics.topOutlets.map(([outlet, count]) => (
                      <div key={outlet}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{outlet}</span>
                          <span className="text-sm font-medium text-gray-900">{count} hits</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${(count / metrics.maxHits) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Templates */}
          {tab === "templates" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {REPORT_TEMPLATES.map((tmpl, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">{tmpl.title}</h3>
                  <p className="text-xs text-gray-500 mb-3">{tmpl.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {tmpl.fields.map(f => (
                      <span key={f} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{f}</span>
                    ))}
                  </div>
                  <button onClick={() => openChatWithContext(`Generate a "${tmpl.title}" report using our latest coverage and campaign data.`)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
