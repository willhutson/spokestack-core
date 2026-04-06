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
  return "bg-gray-100 text-gray-600";
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
          <h1 className="text-2xl font-bold text-gray-900">Request Leave</h1>
          <p className="text-sm text-gray-500 mt-0.5">Submit a new leave request</p>
        </div>

        {/* Leave Request Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">New Request</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Leave Type</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Calculated Days</label>
              <div className="h-9 px-3 flex items-center text-sm text-gray-900 border border-gray-200 rounded-lg bg-gray-50">
                {calculatedDays > 0 ? `${calculatedDays} day${calculatedDays !== 1 ? "s" : ""}` : "--"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes or reason for leave" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={submitting || !startDate || !endDate} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Requests */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Requests</h2>
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">Loading...</div>
          ) : recentRequests.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-sm text-gray-500">No leave requests yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Start</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">End</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Days</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentRequests.map((entry) => {
                    const v = entry.value;
                    const days = v.startDate && v.endDate ? calcDays(v.startDate, v.endDate) : 0;
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.type ?? "--"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{v.startDate ?? "--"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{v.endDate ?? "--"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{days}</td>
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
