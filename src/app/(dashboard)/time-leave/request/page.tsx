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
  };
  createdAt: string;
}

const LEAVE_TYPES = ["Annual", "Sick", "Personal", "Unpaid"];

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

export default function RequestLeavePage() {
  const [entries, setEntries] = useState<LeaveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const calculatedDays = useMemo(() => calcDays(startDate, endDate), [startDate, endDate]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/time-leave/leave", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ type: leaveType, startDate, endDate, notes }),
      });
      setLeaveType(LEAVE_TYPES[0]);
      setStartDate("");
      setEndDate("");
      setNotes("");
      await loadEntries();
    } catch { /* ignore */ } finally { setSubmitting(false); }
  }

  const recentRequests = useMemo(() => entries.slice(0, 10), [entries]);

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
        <TimeLeaveNav />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Request Leave</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Submit a new leave request</p>
        </div>

        {/* Leave Request Form */}
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">New Request</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Leave Type</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Calculated Days</label>
              <div className="h-9 px-3 flex items-center text-sm text-[var(--text-primary)] border border-[var(--border)] rounded-lg bg-[var(--bg-base)]">
                {calculatedDays > 0 ? `${calculatedDays} day${calculatedDays !== 1 ? "s" : ""}` : "--"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes or reason for leave" className="w-full px-3 py-2 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none" />
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={submitting || !startDate || !endDate} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Requests */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Requests</h2>
          {loading ? (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-tertiary)]">Loading...</div>
          ) : recentRequests.length === 0 ? (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
              <p className="text-sm text-[var(--text-secondary)]">No leave requests yet.</p>
            </div>
          ) : (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--bg-base)]">
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Start</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">End</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Days</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {recentRequests.map((entry) => {
                    const v = entry.value;
                    const days = v.startDate && v.endDate ? calcDays(v.startDate, v.endDate) : 0;
                    return (
                      <tr key={entry.id} className="hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{v.type ?? "--"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{v.startDate ?? "--"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{v.endDate ?? "--"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{days}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", statusColor(v.status ?? "Pending"))}>{v.status ?? "Pending"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
