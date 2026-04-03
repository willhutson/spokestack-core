"use client";

import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Subscription {
  id: string;
  entityType: string;
  action: string;
  handler: string;
  moduleType?: string;
  priority: number;
  config?: unknown;
  createdAt: string;
}

const ENTITY_TYPES = ["Task", "Project", "Brief", "Order", "Client", "*"];
const ACTIONS = ["created", "updated", "deleted", "status_changed", "*"];

function handlerType(handler: string): { label: string; color: string } {
  if (handler.startsWith("webhook:")) return { label: "webhook", color: "bg-blue-100 text-blue-700" };
  if (handler.startsWith("agent:")) return { label: "agent", color: "bg-purple-100 text-purple-700" };
  return { label: "module", color: "bg-green-100 text-green-700" };
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export default function WorkflowsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ entityType: "Task", action: "created", handler: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/events/subscriptions", { headers });
        if (res.ok) {
          const data = await res.json();
          setSubscriptions(data.subscriptions ?? []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.handler.trim()) return;
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/events/subscriptions", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: formData.entityType,
          action: formData.action,
          handler: formData.handler.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions((prev) => [data.subscription, ...prev]);
        setFormData({ entityType: "Task", action: "created", handler: "" });
        setShowForm(false);
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {subscriptions.length} workflow{subscriptions.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openChatWithContext("Help me set up an automation workflow.")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            Ask Agent
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Workflow
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : subscriptions.length === 0 && !showForm ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v3.75m0 10.5V21m7.5-18v3.75m0 10.5V21" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No workflows configured</h2>
          <p className="text-sm text-gray-500 max-w-md mb-4">Create one to automate your workspace.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto">
          {subscriptions.map((sub) => {
            const ht = handlerType(sub.handler);
            return (
              <div key={sub.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {sub.entityType === "*" ? "Any Entity" : sub.entityType}
                      </span>
                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      <span className="text-sm text-gray-700">
                        {sub.action === "*" ? "any action" : sub.action}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate max-w-lg">{sub.handler}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Created {new Date(sub.createdAt).toLocaleDateString()}
                      {sub.priority !== 100 && ` \u00b7 Priority ${sub.priority}`}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ht.color}`}>
                    {ht.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Workflow</h2>

            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={formData.entityType}
              onChange={(e) => setFormData((f) => ({ ...f, entityType: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ENTITY_TYPES.map((et) => (
                <option key={et} value={et}>{et === "*" ? "Any (*)" : et}</option>
              ))}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={formData.action}
              onChange={(e) => setFormData((f) => ({ ...f, action: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{a === "*" ? "Any (*)" : a}</option>
              ))}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Handler</label>
            <input
              type="text"
              value={formData.handler}
              onChange={(e) => setFormData((f) => ({ ...f, handler: e.target.value }))}
              placeholder="webhook:https://... or agent:agent-id"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.handler.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
