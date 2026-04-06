"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";
import StatusBadge from "@/components/shared/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Project {
  id: string; name: string; status: string; description?: string;
  metadata?: Record<string, unknown>; createdAt: string;
}
interface ContextEntry {
  id: string; key: string; value: string; category: string;
  metadata?: Record<string, unknown>; createdAt: string;
}
interface Brief {
  id: string; title: string; status: string; content?: string;
  metadata?: Record<string, unknown>; createdAt: string;
}

type Tab = "status_board" | "playbooks" | "stakeholders" | "statements";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "status_board", label: "Status Board" },
  { key: "playbooks", label: "Playbooks" },
  { key: "stakeholders", label: "Stakeholders" },
  { key: "statements", label: "Statements" },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

const PLAYBOOKS = [
  { title: "Data Breach Response", description: "Step-by-step protocol for handling data breaches including notification timelines, stakeholder communication, and regulatory compliance.", severity: "critical" },
  { title: "Executive Misconduct", description: "Framework for addressing allegations of executive misconduct including internal investigation and public statement strategy.", severity: "high" },
  { title: "Product Recall", description: "Communication plan for product safety issues covering customer notification, media response, and social media management.", severity: "high" },
  { title: "Negative Media Coverage", description: "Response strategy for unfavorable press coverage including rapid response protocols and counter-narrative development.", severity: "medium" },
  { title: "Social Media Crisis", description: "Playbook for viral social media incidents including monitoring escalation, response templates, and de-escalation tactics.", severity: "medium" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Log Crisis Form                                                    */
/* ------------------------------------------------------------------ */
function LogCrisisForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required."); return; }
    setErr(null); setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/projects", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), description: description.trim() || undefined,
          status: "ACTIVE", metadata: { type: "crisis", severity },
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
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Log Crisis</h2>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Crisis Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Brief crisis name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="critical">Critical</option>
            </select></div>
          <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe the crisis situation..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" /></div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
            {submitting ? "Logging..." : "Log Crisis"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function CrisisCommsPage() {
  const [tab, setTab] = useState<Tab>("status_board");
  const [projects, setProjects] = useState<Project[]>([]);
  const [stakeholders, setStakeholders] = useState<ContextEntry[]>([]);
  const [statements, setStatements] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [pRes, sRes, bRes] = await Promise.all([
        fetch("/api/v1/projects", { headers }),
        fetch("/api/v1/context?category=crisis_stakeholder", { headers }),
        fetch("/api/v1/briefs", { headers }),
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setProjects((data.projects ?? []).filter((p: Project) => p.metadata?.type === "crisis"));
      }
      if (sRes.ok) setStakeholders((await sRes.json()).entries ?? []);
      if (bRes.ok) {
        const data = await bRes.json();
        setStatements((data.briefs ?? []).filter((b: Brief) => b.metadata?.type === "holding_statement"));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const activeCrises = projects.filter(p => p.status === "ACTIVE");
  const resolvedCrises = projects.filter(p => p.status === "COMPLETED");

  function parseVal(v: string): Record<string, unknown> {
    try { return JSON.parse(v); } catch { return {}; }
  }

  const Skeleton = () => (
    <div className="animate-pulse bg-white border border-gray-200 rounded-xl overflow-hidden">
      {[1, 2, 3].map(i => (
        <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
          <div className="h-4 w-32 bg-gray-200 rounded" /><div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-200 rounded-full ml-auto" />
        </div>
      ))}
    </div>
  );

  return (
    <ModuleLayoutShell moduleType="CRISIS_COMMS">
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Crisis Communications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor, respond to, and manage crisis situations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openChatWithContext("Help me manage a crisis communication situation.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Ask Agent</button>
          {tab === "status_board" && !showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Log Crisis</button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Active Crises</p>
          <p className="text-xl font-bold text-red-600 mt-1">{activeCrises.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Resolved</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{resolvedCrises.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Stakeholders</p>
          <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{stakeholders.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Holding Statements</p>
          <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{statements.length}</p>
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

      {showForm && tab === "status_board" && <LogCrisisForm onCreated={() => { setShowForm(false); reload(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <Skeleton /> : (
        <>
          {/* Status Board */}
          {tab === "status_board" && (
            projects.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No crises logged</h3>
                <p className="text-xs text-gray-500 mb-4">Log a crisis to begin tracking and managing the response.</p>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Log Crisis</button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map(p => {
                  const sev = (p.metadata?.severity as string) || "medium";
                  return (
                    <div key={p.id} className={`border rounded-xl p-5 ${SEVERITY_COLORS[sev] || SEVERITY_COLORS.medium}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${SEVERITY_COLORS[sev]}`}>{sev}</span>
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{p.name}</h3>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      {p.description && <p className="text-sm text-gray-700 mb-2">{p.description}</p>}
                      <p className="text-xs text-gray-500">Logged {fmtDate(p.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Playbooks */}
          {tab === "playbooks" && (
            <div className="space-y-4">
              {PLAYBOOKS.map((pb, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{pb.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${SEVERITY_COLORS[pb.severity]}`}>{pb.severity}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{pb.description}</p>
                  <button onClick={() => openChatWithContext(`Walk me through the "${pb.title}" crisis playbook step by step.`)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    Activate Playbook
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Stakeholders */}
          {tab === "stakeholders" && (
            stakeholders.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No stakeholders mapped</h3>
                <p className="text-xs text-gray-500 mb-4">Map key stakeholders for crisis communication plans.</p>
                <button onClick={() => openChatWithContext("Help me map crisis communication stakeholders.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Map Stakeholders</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Contact</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Priority</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {stakeholders.map(s => { const d = parseVal(s.value); return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">{s.key}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{(d.role as string) || "-"}</td>
                        <td className="px-5 py-4 text-sm text-gray-600">{(d.contact as string) || "-"}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[(d.priority as string) || "medium"]}`}>
                            {(d.priority as string) || "medium"}
                          </span>
                        </td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Statements */}
          {tab === "statements" && (
            statements.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No holding statements</h3>
                <p className="text-xs text-gray-500 mb-4">Prepare holding statements for potential crisis scenarios.</p>
                <button onClick={() => openChatWithContext("Help me draft a holding statement for a crisis scenario.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Draft Statement</button>
              </div>
            ) : (
              <div className="space-y-4">
                {statements.map(s => (
                  <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</h3>
                      <StatusBadge status={s.status} />
                    </div>
                    {s.content && <p className="text-sm text-gray-600 line-clamp-3">{s.content}</p>}
                    <p className="text-xs text-gray-400 mt-2">{fmtDate(s.createdAt)}</p>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
