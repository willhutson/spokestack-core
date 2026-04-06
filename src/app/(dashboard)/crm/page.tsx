"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback, useMemo } from "react";
import { openChatWithContext } from "@/lib/chat-event";
import { getAuthHeaders } from "@/lib/client-auth";
import StatusBadge from "@/components/shared/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Client {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; industry: string | null; isActive: boolean;
  metadata?: Record<string, unknown>; createdAt: string;
  orders?: Order[]; briefs?: { id: string; title: string; status: string }[];
}
interface Order {
  id: string; clientId?: string; clientName?: string; totalCents: number;
  status: string; createdAt: string;
  client?: { id: string; name: string };
}
interface Activity {
  id: string; type: string; entityType: string; entityId: string;
  description: string; createdAt: string;
  metadata?: Record<string, unknown>;
}

type Tab = "clients" | "pipeline" | "deals" | "activity";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "clients", label: "Clients" },
  { key: "pipeline", label: "Pipeline" },
  { key: "deals", label: "Deals" },
  { key: "activity", label: "Activity" },
];

const PIPELINE_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const;
const STAGE_COLORS: Record<string, string> = {
  Lead: "bg-gray-100 border-gray-300",
  Qualified: "bg-blue-50 border-blue-300",
  Proposal: "bg-purple-50 border-purple-300",
  Negotiation: "bg-yellow-50 border-yellow-300",
  Won: "bg-emerald-50 border-emerald-300",
  Lost: "bg-red-50 border-red-300",
};

function fmtCurrency(cents: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(cents / 100);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Add Client Form                                                    */
/* ------------------------------------------------------------------ */
function AddClientForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required."); return; }
    setErr(null); setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/clients", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim() || undefined,
          phone: phone.trim() || undefined, company: company.trim() || undefined,
          industry: industry.trim() || undefined,
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
        <h2 className="text-sm font-semibold text-gray-900">Add Client</h2>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971..." className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {submitting ? "Adding..." : "Add Client"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function CRMPage() {
  const [tab, setTab] = useState<Tab>("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [cRes, oRes, aRes] = await Promise.all([
        fetch("/api/v1/clients", { headers }),
        fetch("/api/v1/orders", { headers }),
        fetch("/api/v1/activity?limit=20", { headers }),
      ]);
      if (cRes.ok) setClients((await cRes.json()).clients ?? []);
      if (oRes.ok) setOrders((await oRes.json()).orders ?? []);
      if (aRes.ok) {
        const data = await aRes.json();
        setActivities((data.activities ?? data.events ?? []).filter(
          (a: Activity) => ["Client", "Order"].includes(a.entityType)
        ));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /* Pipeline: bucket clients by metadata.stage */
  const pipeline = useMemo(() => {
    const map: Record<string, Client[]> = {};
    PIPELINE_STAGES.forEach((s) => (map[s] = []));
    clients.forEach((c) => {
      const stage = (c.metadata?.stage as string) || "Lead";
      (map[stage] ??= []).push(c);
    });
    return map;
  }, [clients]);

  async function moveStage(clientId: string, newStage: string) {
    try {
      const headers = await getAuthHeaders();
      const client = clients.find((c) => c.id === clientId);
      await fetch(`/api/v1/clients/${clientId}`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...(client?.metadata ?? {}), stage: newStage } }),
      });
      reload();
    } catch { /* silent */ }
  }

  /* Deals summary */
  const dealStats = useMemo(() => {
    const total = orders.reduce((s, o) => s + o.totalCents, 0);
    const won = orders.filter((o) => o.status === "COMPLETED" || o.status === "PAID");
    const wonTotal = won.reduce((s, o) => s + o.totalCents, 0);
    return { total, wonTotal, wonCount: won.length, rate: orders.length ? Math.round((won.length / orders.length) * 100) : 0 };
  }, [orders]);

  const Loader = () => (
    <div className="animate-pulse bg-white border border-gray-200 rounded-xl overflow-hidden">
      {[1, 2, 3].map((i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
          <div className="h-4 w-32 bg-gray-200 rounded" /><div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-200 rounded-full ml-auto" />
        </div>
      ))}
    </div>
  );

  return (
    <ModuleLayoutShell moduleType="CRM">
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage client relationships, deals, and pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openChatWithContext("Help me manage my CRM clients and pipeline.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Ask Agent</button>
          {tab === "clients" && !showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Add Client</button>
          )}
          {tab === "deals" && (
            <button onClick={() => openChatWithContext("Create a new deal for a client.")} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">New Deal</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TAB_LABELS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setExpandedId(null); }} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {showForm && tab === "clients" && <AddClientForm onCreated={() => { setShowForm(false); reload(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <Loader /> : (
        <>
          {/* Clients */}
          {tab === "clients" && (
            clients.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No clients yet</h3>
                <p className="text-xs text-gray-500 mb-4">Add your first client to get started.</p>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Add Client</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Email</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Company</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Industry</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clients.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                        <td className="px-5 py-4" colSpan={expandedId === c.id ? 5 : undefined}>
                          {expandedId === c.id ? (
                            <div>
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700">{c.name.charAt(0).toUpperCase()}</div>
                                <div>
                                  <h3 className="text-sm font-semibold text-gray-900">{c.name}</h3>
                                  {c.company && <p className="text-xs text-gray-500">{c.company}</p>}
                                </div>
                                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                                  {c.isActive !== false ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-600 mb-3">
                                <div><span className="font-medium text-gray-500">Email:</span> {c.email || "N/A"}</div>
                                <div><span className="font-medium text-gray-500">Phone:</span> {c.phone || "N/A"}</div>
                                <div><span className="font-medium text-gray-500">Industry:</span> {c.industry || "N/A"}</div>
                                <div><span className="font-medium text-gray-500">Added:</span> {fmtDate(c.createdAt)}</div>
                              </div>
                              {c.orders && c.orders.length > 0 && (
                                <div className="mb-2">
                                  <h4 className="text-xs font-medium text-gray-500 mb-1">Orders</h4>
                                  <div className="space-y-1">{c.orders.map((o) => (
                                    <div key={o.id} className="flex items-center gap-3 text-xs text-gray-600">
                                      <span>#{o.id.slice(-6)}</span>
                                      <StatusBadge status={o.status} />
                                      <span className="ml-auto font-medium">{fmtCurrency(o.totalCents)}</span>
                                    </div>
                                  ))}</div>
                                </div>
                              )}
                              {c.briefs && c.briefs.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-medium text-gray-500 mb-1">Briefs</h4>
                                  <div className="space-y-1">{c.briefs.map((b) => (
                                    <div key={b.id} className="flex items-center gap-3 text-xs text-gray-600">
                                      <span className="truncate">{b.title}</span>
                                      <StatusBadge status={b.status} />
                                    </div>
                                  ))}</div>
                                </div>
                              )}
                            </div>
                          ) : <span className="text-sm font-medium text-gray-900">{c.name}</span>}
                        </td>
                        {expandedId !== c.id && (
                          <>
                            <td className="px-5 py-4 text-sm text-gray-600">{c.email || "-"}</td>
                            <td className="px-5 py-4 text-sm text-gray-600">{c.company || "-"}</td>
                            <td className="px-5 py-4 text-sm text-gray-600">{c.industry || "-"}</td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                                {c.isActive !== false ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Pipeline */}
          {tab === "pipeline" && (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map((stage) => (
                <div key={stage} className={`min-w-[200px] flex-1 rounded-xl border p-3 ${STAGE_COLORS[stage]}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{stage}</h3>
                    <span className="text-xs text-gray-500 font-medium">{pipeline[stage]?.length ?? 0}</span>
                  </div>
                  <div className="space-y-2">
                    {(pipeline[stage] ?? []).map((c) => {
                      const idx = PIPELINE_STAGES.indexOf(stage);
                      const nextStage = idx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[idx + 1] : null;
                      return (
                        <div key={c.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">{c.name.charAt(0)}</div>
                            <span className="text-xs font-medium text-gray-900 truncate">{c.name}</span>
                          </div>
                          {c.company && <p className="text-xs text-gray-500 mb-2 pl-8">{c.company}</p>}
                          {nextStage && (
                            <button onClick={() => moveStage(c.id, nextStage)} className="w-full mt-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
                              Move to {nextStage}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deals */}
          {tab === "deals" && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Pipeline Value</p>
                  <p className="text-lg font-bold text-gray-900">{fmtCurrency(dealStats.total)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Won Value</p>
                  <p className="text-lg font-bold text-emerald-600">{fmtCurrency(dealStats.wonTotal)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Won Deals</p>
                  <p className="text-lg font-bold text-gray-900">{dealStats.wonCount}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Conversion Rate</p>
                  <p className="text-lg font-bold text-gray-900">{dealStats.rate}%</p>
                </div>
              </div>
              {orders.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No deals yet</h3>
                  <p className="text-xs text-gray-500 mb-4">Create a deal to track revenue.</p>
                  <button onClick={() => openChatWithContext("Create a new deal for a client.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">New Deal</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.map((o) => (
                    <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">{o.client?.name ?? o.clientName ?? `Order #${o.id.slice(-6)}`}</h3>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-lg font-bold text-gray-900 mb-1">{fmtCurrency(o.totalCents)}</p>
                      <p className="text-xs text-gray-400">{fmtDate(o.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity */}
          {tab === "activity" && (
            activities.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No recent activity</h3>
                <p className="text-xs text-gray-500">CRM events will appear here.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {activities.map((a) => (
                  <div key={a.id} className="px-5 py-4 flex items-start gap-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${a.entityType === "Client" ? "bg-blue-400" : "bg-emerald-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{a.description || `${a.entityType} ${a.type}`}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(a.createdAt)}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 flex-shrink-0">{a.entityType}</span>
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
