"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { TimeLeaveNav } from "./TimeLeaveNav";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user?: { id: string; email: string; name?: string; avatarUrl?: string };
  team?: { id: string; name: string };
}

interface ContextEntry {
  id: string;
  category: string;
  value: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

type Tab = "timesheet" | "leave" | "team";

function getWeekStart(offset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDays(offset: number): { label: string; date: string; iso: string }[] {
  const monday = getWeekStart(offset);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const days: { label: string; date: string; iso: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      label: labels[i],
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      iso: d.toISOString().split("T")[0],
    });
  }
  return days;
}

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    OWNER: "bg-amber-100 text-amber-700",
    ADMIN: "bg-blue-100 text-blue-700",
    MEMBER: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
    VIEWER: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  };
  return colors[role] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]";
}

function statusColor(s: string) {
  if (s === "Approved") return "bg-emerald-50 text-emerald-600";
  if (s === "Rejected") return "bg-red-50 text-red-600";
  return "bg-[var(--bg-surface)] text-[var(--text-secondary)]";
}

export default function TimeLeavePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("timesheet");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  // Timesheet state: { `${userId}-${isoDate}`: hours }
  const [hours, setHours] = useState<Record<string, number>>({});
  const [timeEntries, setTimeEntries] = useState<ContextEntry[]>([]);
  const [savingTime, setSavingTime] = useState(false);

  // Leave state
  const [leaveEntries, setLeaveEntries] = useState<ContextEntry[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveType, setLeaveType] = useState("Annual");
  const [leaveReason, setLeaveReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [updatingLeave, setUpdatingLeave] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const loadMembers = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/members", { headers });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadTimeEntries = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/context?category=time_entry", { headers });
      if (res.ok) {
        const data = await res.json();
        const entries: ContextEntry[] = data.entries ?? data.contexts ?? data ?? [];
        setTimeEntries(entries);
        // Populate hours grid from entries
        const h: Record<string, number> = {};
        entries.forEach((e) => {
          const v = e.value as { userId?: string; date?: string; hours?: number };
          if (v.userId && v.date) h[`${v.userId}-${v.date}`] = v.hours ?? 0;
        });
        setHours(h);
      }
    } catch { /* ignore */ }
  }, []);

  const loadLeaveEntries = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/context?category=leave_request", { headers });
      if (res.ok) {
        const data = await res.json();
        setLeaveEntries(data.entries ?? data.contexts ?? data ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadMembers(); loadTimeEntries(); loadLeaveEntries(); }, [loadMembers, loadTimeEntries, loadLeaveEntries]);

  function setHoursCell(userId: string, iso: string, val: number) {
    setHours((prev) => ({ ...prev, [`${userId}-${iso}`]: Math.min(24, Math.max(0, val)) }));
  }

  async function saveTimeEntries() {
    setSavingTime(true);
    try {
      const headers = await getAuthHeaders();
      for (const [key, val] of Object.entries(hours)) {
        if (val <= 0) continue;
        const [userId, date] = [key.substring(0, key.lastIndexOf("-")), key.substring(key.lastIndexOf("-") - 6)];
        // Parse key properly: userId-YYYY-MM-DD
        const parts = key.split("-");
        const isoDate = parts.slice(-3).join("-");
        const uid = parts.slice(0, -3).join("-");
        await fetch("/api/v1/context", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "time_entry",
            value: { userId: uid, date: isoDate, hours: val },
          }),
        });
      }
      await loadTimeEntries();
    } catch { /* ignore */ } finally { setSavingTime(false); }
  }

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) return;
    setSubmittingLeave(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/context", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "leave_request",
          value: { startDate: leaveStart, endDate: leaveEnd, type: leaveType, reason: leaveReason, status: "Pending" },
        }),
      });
      setLeaveStart(""); setLeaveEnd(""); setLeaveType("Annual"); setLeaveReason("");
      setShowLeaveForm(false);
      await loadLeaveEntries();
    } catch { /* ignore */ } finally { setSubmittingLeave(false); }
  }

  async function updateLeaveStatus(entryId: string, newStatus: string) {
    setUpdatingLeave(entryId);
    try {
      const headers = await getAuthHeaders();
      const entry = leaveEntries.find((e) => e.id === entryId);
      if (!entry) return;
      await fetch(`/api/v1/context/${entryId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ value: { ...entry.value, status: newStatus } }),
      });
      setLeaveEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, value: { ...e.value, status: newStatus } } : e))
      );
    } catch { /* ignore */ } finally { setUpdatingLeave(null); }
  }

  // Compute weekly hours per member from timeEntries
  const weekHoursMap = useMemo(() => {
    const m: Record<string, number> = {};
    const weekIsos = weekDays.map((d) => d.iso);
    timeEntries.forEach((e) => {
      const v = e.value as { userId?: string; date?: string; hours?: number };
      if (v.userId && v.date && weekIsos.includes(v.date)) {
        m[v.userId] = (m[v.userId] ?? 0) + (v.hours ?? 0);
      }
    });
    return m;
  }, [timeEntries, weekDays]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "timesheet", label: "Timesheet" },
    { key: "leave", label: "Leave" },
    { key: "team", label: "Team" },
  ];

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
      <TimeLeaveNav />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Time & Leave</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{members.length} team member{members.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setTab("leave"); setShowLeaveForm(true); }} className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Request Leave</button>
          <button onClick={() => router.push("/settings")} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">Invite Member</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--bg-surface)] rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? "bg-[var(--bg-base)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TIMESHEET TAB */}
      {tab === "timesheet" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset((w) => w - 1)} className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Last Week</button>
              <button onClick={() => setWeekOffset(0)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${weekOffset === 0 ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]"}`}>This Week</button>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Next Week</button>
            </div>
            <button onClick={saveTimeEntries} disabled={savingTime} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
              {savingTime ? "Saving..." : "Log Hours"}
            </button>
          </div>
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 w-48">Member</th>
                  {weekDays.map((d) => (
                    <th key={d.iso} className="text-center text-xs font-medium text-[var(--text-secondary)] px-2 py-3">
                      <div>{d.label}</div>
                      <div className="text-[var(--text-tertiary)] font-normal">{d.date}</div>
                    </th>
                  ))}
                  <th className="text-center text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-sm text-[var(--text-tertiary)]">Loading...</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-sm text-[var(--text-tertiary)]">No members to display</td></tr>
                ) : (
                  members.map((m) => {
                    const uid = m.user?.id ?? m.id;
                    const weekTotal = weekDays.reduce((s, d) => s + (hours[`${uid}-${d.iso}`] ?? 0), 0);
                    return (
                      <tr key={m.id} className="hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 text-sm text-[var(--text-primary)] truncate max-w-[12rem]">
                          {m.user?.name ?? m.user?.email ?? "Unknown"}
                        </td>
                        {weekDays.map((d) => (
                          <td key={d.iso} className="text-center px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              max={24}
                              value={hours[`${uid}-${d.iso}`] ?? ""}
                              onChange={(e) => setHoursCell(uid, d.iso, parseFloat(e.target.value) || 0)}
                              placeholder="--"
                              className="w-14 h-8 text-center text-sm border border-[var(--border)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                            />
                          </td>
                        ))}
                        <td className="text-center px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{weekTotal > 0 ? `${weekTotal}h` : "--"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEAVE TAB */}
      {tab === "leave" && (
        <div>
          {!showLeaveForm && (
            <div className="mb-4">
              <button onClick={() => setShowLeaveForm(true)} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
                + Request Leave
              </button>
            </div>
          )}

          {showLeaveForm && (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Request Leave</h2>
                <button onClick={() => setShowLeaveForm(false)} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">Cancel</button>
              </div>
              <form onSubmit={submitLeave} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
                  <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date</label>
                  <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Type</label>
                  <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                    <option>Annual</option>
                    <option>Sick</option>
                    <option>Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Reason</label>
                  <input type="text" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Optional reason" className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                </div>
                <div className="col-span-2">
                  <button type="submit" disabled={submittingLeave} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
                    {submittingLeave ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Leave Requests List */}
          {leaveEntries.length === 0 ? (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No leave requests yet</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Submit a leave request to start tracking your time off.</p>
              <button onClick={() => setShowLeaveForm(true)} className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Request Leave</button>
            </div>
          ) : (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--bg-base)]">
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Start</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">End</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Reason</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {leaveEntries.map((entry) => {
                    const v = entry.value as { type?: string; startDate?: string; endDate?: string; reason?: string; status?: string };
                    const st = (v.status as string) ?? "Pending";
                    return (
                      <tr key={entry.id} className="hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{v.type ?? "--"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{v.startDate ?? "--"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{v.endDate ?? "--"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] max-w-[200px] truncate">{(v.reason as string) || "--"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(st)}`}>{st}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {st === "Pending" && (
                            <div className="flex justify-end gap-1.5">
                              <button disabled={updatingLeave === entry.id} onClick={() => updateLeaveStatus(entry.id, "Approved")} className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 disabled:opacity-50 transition-colors">Approve</button>
                              <button disabled={updatingLeave === entry.id} onClick={() => updateLeaveStatus(entry.id, "Rejected")} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50 transition-colors">Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TEAM TAB */}
      {tab === "team" && (
        <div>
          {loading ? (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 border-b border-[var(--border)]">
                  <div className="w-10 h-10 bg-[var(--bg-surface)] rounded-full" />
                  <div className="flex-1"><div className="h-4 bg-[var(--bg-surface)] rounded w-1/4 mb-2" /><div className="h-3 bg-[var(--bg-surface)] rounded w-1/3" /></div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No team members</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Invite members to get started.</p>
              <button onClick={() => router.push("/settings")} className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Invite Member</button>
            </div>
          ) : (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--bg-base)]">
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Member</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Role</th>
                    <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Hours This Week</th>
                    <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Leave Balance</th>
                    <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {members.map((m) => {
                    const uid = m.user?.id ?? m.id;
                    const wh = weekHoursMap[uid] ?? 0;
                    // Leave balance: 30 days minus approved leave days
                    const usedLeave = leaveEntries.filter((e) => {
                      const v = e.value as { status?: string };
                      return v.status === "Approved";
                    }).length;
                    const balance = Math.max(0, 30 - usedLeave);
                    return (
                      <tr key={m.id} className="hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[var(--accent-subtle)] rounded-full flex items-center justify-center text-xs font-semibold text-[var(--accent)]">
                              {(m.user?.name?.[0] ?? m.user?.email?.[0] ?? "?").toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{m.user?.name ?? m.user?.email ?? "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{m.user?.email ?? "--"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(m.role)}`}>{m.role}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-[var(--text-primary)]">{wh > 0 ? `${wh}h` : "--"}</td>
                        <td className="px-4 py-3 text-right text-sm text-[var(--text-secondary)]">{balance} days</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => router.push("/settings")} className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">Manage</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
