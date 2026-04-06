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
  };
  createdAt: string;
}

const LEAVE_TYPES = ["Annual", "Sick", "Personal"];
const YEAR_OPTIONS = [2024, 2025, 2026];

function statusColor(s: string) {
  if (s === "Approved") return "bg-emerald-50 text-emerald-600";
  if (s === "Rejected") return "bg-red-50 text-red-600";
  if (s === "Pending") return "bg-amber-50 text-amber-600";
  return "bg-[var(--bg-surface)] text-[var(--text-secondary)]";
}

function calcDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, diff);
}

const BALANCES: Record<string, number> = { Annual: 20, Sick: 10, Personal: 5 };

export default function MyLeavePage() {
  const [entries, setEntries] = useState<LeaveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState("All");

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

  const usedDays = useMemo(() => {
    const used: Record<string, number> = { Annual: 0, Sick: 0, Personal: 0 };
    entries.forEach((e) => {
      const v = e.value;
      if (v.status === "Approved" && v.type && v.startDate && v.endDate) {
        const year = new Date(v.startDate).getFullYear();
        if (year === filterYear && used[v.type] !== undefined) {
          used[v.type] += calcDays(v.startDate, v.endDate);
        }
      }
    });
    return used;
  }, [entries, filterYear]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const v = e.value;
      const year = v.startDate ? new Date(v.startDate).getFullYear() : null;
      if (year !== filterYear) return false;
      if (filterType !== "All" && v.type !== filterType) return false;
      return true;
    });
  }, [entries, filterYear, filterType]);

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
        <TimeLeaveNav />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Leave</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">View your leave balances and history</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {LEAVE_TYPES.map((type) => {
            const total = BALANCES[type];
            const used = usedDays[type] ?? 0;
            const remaining = Math.max(0, total - used);
            return (
              <div key={type} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">{type} Leave</h3>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">{used}</span>
                  <span className="text-sm text-[var(--text-tertiary)] mb-0.5">/ {total} days used</span>
                </div>
                <div className="mt-3 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", type === "Annual" ? "bg-blue-500" : type === "Sick" ? "bg-red-500" : "bg-purple-500")} style={{ width: `${Math.min(100, (used / total) * 100)}%` }} />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{remaining} days remaining</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
            <option value="All">All Types</option>
            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Leave History Table */}
        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-tertiary)]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No leave records</h3>
            <p className="text-xs text-[var(--text-secondary)]">No leave requests found for the selected filters.</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Start Date</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">End Date</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Days</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((entry) => {
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
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] max-w-[200px] truncate">{v.notes || "--"}</td>
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
