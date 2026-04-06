"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Policy {
  id: string;
  name: string;
  description?: string;
  rulesCount: number;
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

export default function AccessControlPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPolicies = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/access-control/policies", { headers });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const totalRules = policies.reduce((sum, p) => sum + (p.rulesCount ?? 0), 0);

  return (
    <ModuleLayoutShell moduleType="ACCESS_CONTROL">
    <div className="p-6 bg-[var(--bg-base)] min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Access Control</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Enterprise role-based access control and policy management.</p>
        </div>
        <button
          onClick={() => openChatWithContext("Help me create a new access control policy with RBAC rules.")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Policy
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
          <MetricCard label="Policies" value={policies.length} />
          <MetricCard label="Total Rules" value={totalRules} />
          <MetricCard label="Active Policies" value={policies.filter((p) => p.status === "ACTIVE").length} />
        </div>
      )}

      {/* RBAC Explanation */}
      <div className="bg-[var(--accent-subtle)] border border-[var(--accent)] rounded-lg p-4 mb-6 flex items-start gap-3">
        <svg className="w-5 h-5 text-[var(--accent)] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Role-Based Access Control (RBAC)</p>
          <p className="text-sm text-[var(--accent)] mt-0.5">Define policies that control what each role can access across your organization. Assign rules to roles like Admin, Manager, Member, and Viewer to enforce fine-grained permissions on modules, data, and actions.</p>
        </div>
      </div>

      {/* Policies List */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Policies</h2>
        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/3" />
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/6 ml-auto" />
              </div>
            ))}
          </div>
        ) : policies.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No policies defined</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Create access control policies to manage permissions across your organization.</p>
            <button
              onClick={() => openChatWithContext("Help me create a new access control policy with RBAC rules.")}
              className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors"
            >
              Create Policy
            </button>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Policy Name</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Description</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Rules</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] truncate max-w-[200px]">{p.description ?? "--"}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">{p.rulesCount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-tertiary)] text-right">
                      {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
