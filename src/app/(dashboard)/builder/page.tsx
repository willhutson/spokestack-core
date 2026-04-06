"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Template {
  id: string;
  name: string;
  type: string;
  permissions: string[];
  updatedAt: string;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

export default function BuilderPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/builder/templates", { headers });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <ModuleLayoutShell moduleType="BUILDER">
    <div className="p-6 bg-[var(--bg-base)] min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Builder</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Enterprise template management and workflow builder.</p>
        </div>
        <button
          onClick={() => openChatWithContext("Help me create a new enterprise template.")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Template
        </button>
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
          <MetricCard label="Templates" value={templates.length} />
          <MetricCard label="Permissions" value={templates.reduce((sum, t) => sum + (t.permissions?.length ?? 0), 0)} />
          <MetricCard label="Audit Entries" value={0} />
        </div>
      )}

      {/* Template List */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Templates</h2>
        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/3" />
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/6 ml-auto" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.06a.75.75 0 010-1.28l5.1-3.06a.75.75 0 01.76 0l5.1 3.06a.75.75 0 010 1.28l-5.1 3.06a.75.75 0 01-.76 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No templates yet</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Build reusable enterprise templates for your team workflows.</p>
            <button
              onClick={() => openChatWithContext("Help me create a new enterprise template.")}
              className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors"
            >
              New Template
            </button>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Type</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Permissions</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {templates.map((t) => (
                  <tr key={t.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">{t.permissions?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-tertiary)] text-right">
                      {new Date(t.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    </ModuleLayoutShell>
  );
}
