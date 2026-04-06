"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
  createdAt: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: string;
  createdAt: string;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

export default function ApiManagementPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [keysRes, webhooksRes] = await Promise.all([
        fetch("/api/v1/api-keys", { headers }),
        fetch("/api/v1/webhooks", { headers }),
      ]);
      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.apiKeys ?? []);
      }
      if (webhooksRes.ok) {
        const data = await webhooksRes.json();
        setWebhooks(data.webhooks ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <ModuleLayoutShell moduleType="API_MANAGEMENT">
    <div className="p-6 bg-[var(--bg-base)] min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">API Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage API keys, webhooks, and integration endpoints.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openChatWithContext("Help me create a new webhook subscription.")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Create Webhook
          </button>
          <button
            onClick={() => openChatWithContext("Help me generate a new API key for my integration.")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            Generate Key
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
              <div className="h-3 w-20 bg-[var(--bg-surface)] rounded mb-2" />
              <div className="h-6 w-16 bg-[var(--bg-surface)] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <MetricCard label="API Keys" value={apiKeys.length} />
          <MetricCard label="Webhooks" value={webhooks.length} />
          <MetricCard label="Request Logs" value={0} />
        </div>
      )}

      {/* API Keys Table */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">API Keys</h2>
        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/3" />
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/6 ml-auto" />
              </div>
            ))}
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No API keys</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Generate an API key to integrate with external services.</p>
            <button
              onClick={() => openChatWithContext("Help me generate a new API key for my integration.")}
              className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors"
            >
              Generate Key
            </button>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Key Prefix</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Scopes</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Last Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{key.name}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] font-mono">{key.prefix}...</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{key.scopes?.join(", ") ?? "--"}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-tertiary)] text-right">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Webhook Subscriptions */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Webhook Subscriptions</h2>
        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/2" />
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/6 ml-auto" />
              </div>
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No webhooks configured</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Set up webhooks to receive real-time event notifications.</p>
            <button
              onClick={() => openChatWithContext("Help me create a new webhook subscription.")}
              className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors"
            >
              Create Webhook
            </button>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">URL</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Events</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-[var(--text-primary)] truncate max-w-[250px]">{wh.url}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{wh.events?.join(", ") ?? "--"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${wh.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"}`}>
                        {wh.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-tertiary)] text-right">
                      {new Date(wh.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Request Logs Placeholder */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Request Logs</h2>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Request logs</h3>
          <p className="text-xs text-[var(--text-secondary)]">API request logs will appear here once you start making API calls.</p>
        </div>
      </section>
    </div>
    </ModuleLayoutShell>
  );
}
