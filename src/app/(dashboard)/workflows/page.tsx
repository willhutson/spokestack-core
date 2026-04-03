"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";
import CanvasRenderer, { type CanvasEdgeData } from "@/components/mission-control/CanvasRenderer";
import type { CanvasNodeData } from "@/components/mission-control/CanvasNode";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Subscription {
  id: string; entityType: string; action: string; handler: string;
  moduleType?: string; priority: number; enabled?: boolean;
  config?: unknown; createdAt: string;
}

type Tab = "active" | "templates" | "canvas";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "active", label: "Active Workflows" },
  { key: "templates", label: "Templates" },
  { key: "canvas", label: "Canvas" },
];

const ENTITY_TYPES = ["Task", "Project", "Brief", "Order", "Client", "*"];
const ACTIONS = ["created", "updated", "deleted", "status_changed", "*"];

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */
const TEMPLATES = [
  { name: "New Client Onboarding", entityType: "Client", action: "created", handler: "agent:onboarding", desc: "Trigger onboarding flow when a new client is added." },
  { name: "Brief Review Cycle", entityType: "Brief", action: "status_changed", handler: "webhook:notify", desc: "Notify reviewers when a brief moves to IN_REVIEW." },
  { name: "Order Fulfillment", entityType: "Order", action: "created", handler: "agent:fulfillment", desc: "Start fulfillment agent when an order is placed." },
  { name: "Task Assignment Notification", entityType: "Task", action: "created", handler: "webhook:notify", desc: "Send notification when a task is assigned." },
  { name: "Project Completion", entityType: "Project", action: "status_changed", handler: "module:FINANCE", desc: "Trigger finance module when a project is completed." },
  { name: "Daily Digest", entityType: "*", action: "*", handler: "agent:digest", desc: "Generate a daily summary of all workspace activity." },
];

const TEMPLATE_COLORS = [
  "border-blue-200 bg-blue-50", "border-yellow-200 bg-yellow-50",
  "border-emerald-200 bg-emerald-50", "border-purple-200 bg-purple-50",
  "border-pink-200 bg-pink-50", "border-indigo-200 bg-indigo-50",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function handlerType(handler: string): { label: string; color: string } {
  if (handler.startsWith("webhook:")) return { label: "webhook", color: "bg-blue-100 text-blue-700" };
  if (handler.startsWith("agent:")) return { label: "agent", color: "bg-purple-100 text-purple-700" };
  return { label: "module", color: "bg-green-100 text-green-700" };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function WorkflowsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ entityType: "Task", action: "created", handler: "" });
  const [submitting, setSubmitting] = useState(false);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNodeData[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdgeData[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [subRes, canvasRes] = await Promise.all([
        fetch("/api/v1/events/subscriptions", { headers }),
        fetch("/api/v1/mission-control", { headers }).catch(() => null),
      ]);
      if (subRes.ok) setSubscriptions((await subRes.json()).subscriptions ?? []);
      if (canvasRes?.ok) {
        const data = await canvasRes.json();
        setCanvasNodes(data.nodes ?? []);
        setCanvasEdges(data.edges ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.handler.trim()) return;
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/events/subscriptions", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: formData.entityType, action: formData.action, handler: formData.handler.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions((prev) => [data.subscription, ...prev]);
        setFormData({ entityType: "Task", action: "created", handler: "" });
        setShowForm(false);
      }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  }

  async function useTemplate(t: typeof TEMPLATES[number]) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/events/subscriptions", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: t.entityType, action: t.action, handler: t.handler }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions((prev) => [data.subscription, ...prev]);
        setTab("active");
      }
    } catch { /* silent */ }
  }

  async function toggleEnabled(sub: Subscription) {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/v1/events/subscriptions/${sub.id}`, {
        method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !(sub.enabled ?? true) }),
      });
      setSubscriptions((prev) => prev.map((s) => s.id === sub.id ? { ...s, enabled: !(s.enabled ?? true) } : s));
    } catch { /* silent */ }
  }

  return (
    <div className="p-6 h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subscriptions.length} workflow{subscriptions.length !== 1 ? "s" : ""} configured</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openChatWithContext("Help me set up an automation workflow.")} className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Ask Agent</button>
          {tab === "active" && (
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Create Workflow</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TAB_LABELS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Inline create form */}
      {showForm && tab === "active" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Create Workflow</h2>
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
                <select value={formData.entityType} onChange={(e) => setFormData((f) => ({ ...f, entityType: e.target.value }))} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {ENTITY_TYPES.map((et) => <option key={et} value={et}>{et === "*" ? "Any (*)" : et}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                <select value={formData.action} onChange={(e) => setFormData((f) => ({ ...f, action: e.target.value }))} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {ACTIONS.map((a) => <option key={a} value={a}>{a === "*" ? "Any (*)" : a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Handler</label>
                <input value={formData.handler} onChange={(e) => setFormData((f) => ({ ...f, handler: e.target.value }))} placeholder="webhook:https://... or agent:id" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button type="submit" disabled={submitting || !formData.handler.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Active Workflows */}
          {tab === "active" && (
            subscriptions.length === 0 && !showForm ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">No workflows configured</h2>
                <p className="text-sm text-gray-500 max-w-md mb-4">Create one or use a template to automate your workspace.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Create Workflow</button>
                  <button onClick={() => setTab("templates")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Browse Templates</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto">
                {subscriptions.map((sub) => {
                  const ht = handlerType(sub.handler);
                  const enabled = sub.enabled ?? true;
                  return (
                    <div key={sub.id} className={`bg-white border rounded-lg p-4 transition-colors ${enabled ? "border-gray-200 hover:border-gray-300" : "border-gray-100 opacity-60"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">{sub.entityType === "*" ? "Any Entity" : sub.entityType}</span>
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                            <span className="text-sm text-gray-700">{sub.action === "*" ? "any action" : sub.action}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono truncate max-w-lg">{sub.handler}</p>
                          <p className="text-xs text-gray-400 mt-1">Created {new Date(sub.createdAt).toLocaleDateString()}{sub.priority !== 100 && ` · Priority ${sub.priority}`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ht.color}`}>{ht.label}</span>
                          <button onClick={(e) => { e.stopPropagation(); toggleEnabled(sub); }}
                            className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? "bg-indigo-600" : "bg-gray-300"}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "left-4" : "left-0.5"}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Templates */}
          {tab === "templates" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((t, i) => (
                <div key={t.name} className={`border rounded-xl p-5 ${TEMPLATE_COLORS[i % TEMPLATE_COLORS.length]}`}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{t.name}</h3>
                  <p className="text-xs text-gray-600 mb-3">{t.desc}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span className="font-mono">{t.entityType}.{t.action}</span>
                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${handlerType(t.handler).color}`}>{t.handler}</span>
                  </div>
                  <button onClick={() => useTemplate(t)} className="w-full px-3 py-2 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Canvas */}
          {tab === "canvas" && (
            canvasNodes.length > 0 ? (
              <div className="flex-1 rounded-xl overflow-hidden border border-gray-200" style={{ minHeight: 500 }}>
                <CanvasRenderer nodes={canvasNodes} edges={canvasEdges} width={2000} height={1200} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">No canvas data</h2>
                <p className="text-sm text-gray-500 max-w-md mb-4">Create a workflow canvas from Mission Control to visualize your automation graph.</p>
                <button onClick={() => openChatWithContext("Create a workflow canvas for my automation.")} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                  Create Workflow Canvas
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
