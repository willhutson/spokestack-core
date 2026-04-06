"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Delegation {
  id: string;
  delegateTo: string;
  scope: string;
  status: string;
  expiresAt?: string;
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

export default function DelegationPage() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDelegations = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/delegations", { headers });
      if (res.ok) {
        const data = await res.json();
        setDelegations(data.delegations ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDelegations();
  }, [loadDelegations]);

  const activeDelegations = delegations.filter((d) => d.status === "ACTIVE");

  return (
    <ModuleLayoutShell moduleType="DELEGATION">
    <div className="p-6 bg-[var(--bg-base)] min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Delegation</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Enterprise permission delegation and authority management.</p>
        </div>
        <button
          onClick={() => openChatWithContext("Help me set up a new delegation of authority.")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Delegation
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
          <MetricCard label="Total Delegations" value={delegations.length} />
          <MetricCard label="Active" value={activeDelegations.length} />
          <MetricCard label="Expired" value={delegations.filter((d) => d.status === "EXPIRED").length} />
        </div>
      )}

      {/* Explanation */}
      <div className="bg-[var(--accent-subtle)] border border-[var(--accent)] rounded-lg p-4 mb-6 flex items-start gap-3">
        <svg className="w-5 h-5 text-[var(--accent)] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">What is delegation?</p>
          <p className="text-sm text-[var(--accent)] mt-0.5">Delegation allows you to temporarily grant your permissions or authority to another team member. Use it when you are out of office, on leave, or need someone to act on your behalf for approvals, reviews, or project management tasks.</p>
        </div>
      </div>

      {/* Delegation List */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">Active Delegations</h2>
        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/3" />
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/6 ml-auto" />
              </div>
            ))}
          </div>
        ) : delegations.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No active delegations</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Create a delegation when you need someone to act on your behalf.</p>
            <button
              onClick={() => openChatWithContext("Help me set up a new delegation of authority.")}
              className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors"
            >
              New Delegation
            </button>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Delegate To</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Scope</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {delegations.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{d.delegateTo}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{d.scope}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-tertiary)] text-right">
                      {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No expiry"}
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
