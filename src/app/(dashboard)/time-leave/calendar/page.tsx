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
    status?: string;
    userId?: string;
  };
  createdAt: string;
}

interface Member {
  id: string;
  user?: { id: string; name?: string; email: string };
}

const TYPE_COLORS: Record<string, string> = {
  Annual: "bg-blue-200 text-blue-800",
  Sick: "bg-red-200 text-red-800",
  Personal: "bg-purple-200 text-purple-800",
  Unpaid: "bg-gray-200 text-gray-700",
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

export default function CalendarPage() {
  const [leaveEntries, setLeaveEntries] = useState<LeaveEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [leaveRes, memberRes] = await Promise.all([
        fetch("/api/v1/time-leave/leave", { headers }),
        fetch("/api/v1/members", { headers }),
      ]);
      if (leaveRes.ok) {
        const data = await leaveRes.json();
        setLeaveEntries(data.entries ?? []);
      }
      if (memberRes.ok) {
        const data = await memberRes.json();
        setMembers(data.members ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const memberMap = useMemo(() => {
    const m: Record<string, string> = {};
    members.forEach((mem) => {
      const uid = mem.user?.id ?? mem.id;
      m[uid] = mem.user?.name ?? mem.user?.email ?? "Unknown";
    });
    return m;
  }, [members]);

  // Build map: iso date -> list of { userId, type, name }
  const dayLeaveMap = useMemo(() => {
    const map: Record<string, { userId: string; type: string; name: string }[]> = {};
    leaveEntries.forEach((e) => {
      const v = e.value;
      if (v.status !== "Approved" || !v.startDate || !v.endDate) return;
      const start = new Date(v.startDate);
      const end = new Date(v.endDate);
      const cursor = new Date(start);
      while (cursor <= end) {
        const iso = cursor.toISOString().split("T")[0];
        if (!map[iso]) map[iso] = [];
        map[iso].push({
          userId: v.userId ?? "",
          type: v.type ?? "Annual",
          name: memberMap[v.userId ?? ""] ?? "Unknown",
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [leaveEntries, memberMap]);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
        <TimeLeaveNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Calendar</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Team availability overview</p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setMonthOffset((o) => o - 1)} className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Prev</button>
          <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={() => setMonthOffset((o) => o + 1)} className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Next</button>
          <button onClick={() => setMonthOffset(0)} className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", monthOffset === 0 ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]")}>Today</button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-200" /><span className="text-xs text-[var(--text-secondary)]">Annual</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-200" /><span className="text-xs text-[var(--text-secondary)]">Sick</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-200" /><span className="text-xs text-[var(--text-secondary)]">Personal</span></div>
        </div>

        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-tertiary)]">Loading...</div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-[var(--bg-base)]">
              {dayLabels.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-[var(--text-secondary)] py-2 border-b border-[var(--border)]">{d}</div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-[var(--border)] bg-[var(--bg-base)]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const leaves = dayLeaveMap[iso] ?? [];
                const isToday = iso === new Date().toISOString().split("T")[0];
                return (
                  <div key={day} className={cn("min-h-[80px] border-b border-r border-[var(--border)] p-1", isToday && "bg-[var(--accent-subtle)]")}>
                    <div className={cn("text-xs font-medium mb-1", isToday ? "text-[var(--accent)]" : "text-[var(--text-secondary)]")}>{day}</div>
                    <div className="space-y-0.5">
                      {leaves.slice(0, 3).map((l, idx) => (
                        <div key={idx} className={cn("text-[10px] px-1 py-0.5 rounded truncate", TYPE_COLORS[l.type] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]")}>
                          {l.name}
                        </div>
                      ))}
                      {leaves.length > 3 && (
                        <div className="text-[10px] text-[var(--text-tertiary)] px-1">+{leaves.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
