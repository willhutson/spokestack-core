"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { TimeLeaveNav } from "../TimeLeaveNav";
import { cn } from "@/lib/utils";

interface LeaveEntry {
  id: string;
  value: {
    type?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
    status?: string;
    userId?: string;
    employeeName?: string;
  };
  createdAt: string;
}

type ApprovalTab = "Pending" | "Approved" | "Rejected";

function statusColor(s: string) {
  if (s === "Approved") return "bg-emerald-50 text-emerald-600";
  if (s === "Rejected") return "bg-red-50 text-red-600";
  if (s === "Pending") return "bg-amber-50 text-amber-600";
  return "bg-[var(--bg-surface)] text-[var(--text-secondary)]";
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, diff);
}

export default function ApprovalsPage() {
  const [entries, setEntries] = useState<LeaveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ApprovalTab>("Pending");
  const [updating, setUpdating] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadEntries = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/time-leave/leave", { headers });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function updateStatus(entryId: string, newStatus: string, reason?: string) {
    setUpdating(entryId);
    try {
      const headers = await getAuthHeaders();
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      await fetch(`/api/v1/context/${entryId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ value: { ...entry.value, status: newStatus, ...(reason ? { rejectionReason: reason } : {}) } }),
      });
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, value: { ...e.value, status: newStatus } } : e))
      );
      setRejectId(null);
      setRejectReason("");
    } catch { /* ignore */ } finally { setUpdating(null); }
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => (e.value.status ?? "Pending") === activeTab);
  }, [entries, activeTab]);

  const tabs: ApprovalTab[] = ["Pending", "Approved", "Rejected"];
  const counts = useMemo(() => {
    const c: Record<string, number> = { Pending: 0, Approved: 0, Rejected: 0 };
    entries.forEach((e) => { const s = e.value.status ?? "Pending"; if (c[s] !== undefined) c[s]++; });
    return c;
  }, [entries]);

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
        <TimeLeaveNav />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Approvals</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage leave requests from team members</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[var(--bg-surface)] rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", activeTab === t ? "bg-[var(--bg-base)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>

        {/* Reject Reason Dialog */}
        {rejectId && (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Rejection Reason</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Provide a reason for rejecting this request" className="w-full px-3 py-2 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none mb-3" />
            <div className="flex items-center gap-2">
              <button onClick={() => updateStatus(rejectId, "Rejected", rejectReason)} disabled={updating === rejectId} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {updating === rejectId ? "Rejecting..." : "Confirm Reject"}
              </button>
              <button onClick={() => { setRejectId(null); setRejectReason(""); }} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Requests List */}
        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-tertiary)]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No {activeTab.toLowerCase()} requests</h3>
            <p className="text-xs text-[var(--text-secondary)]">There are no {activeTab.toLowerCase()} leave requests to display.</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Dates</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Days</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Reason</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
                  {activeTab === "Pending" && <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((entry) => {
                  const v = entry.value;
                  const days = v.startDate && v.endDate ? calcDays(v.startDate, v.endDate) : 0;
                  return (
                    <tr key={entry.id} className="hover:bg-[var(--bg-hover)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{v.employeeName ?? v.userId ?? "Unknown"}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{v.type ?? "--"}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{v.startDate ?? "--"} - {v.endDate ?? "--"}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{days}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] max-w-[200px] truncate">{v.notes || "--"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", statusColor(v.status ?? "Pending"))}>{v.status ?? "Pending"}</span>
                      </td>
                      {activeTab === "Pending" && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button disabled={updating === entry.id} onClick={() => updateStatus(entry.id, "Approved")} className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 disabled:opacity-50 transition-colors">Approve</button>
                            <button disabled={updating === entry.id} onClick={() => setRejectId(entry.id)} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50 transition-colors">Reject</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
