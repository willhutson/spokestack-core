"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { TimeLeaveNav } from "../TimeLeaveNav";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  role: string;
  user?: { id: string; email: string; name?: string };
}

interface ContextEntry {
  id: string;
  value: Record<string, unknown>;
  createdAt: string;
}

type SheetStatus = "DRAFT" | "SUBMITTED" | "APPROVED";

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
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days: { label: string; date: string; iso: string }[] = [];
  for (let i = 0; i < 7; i++) {
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

const PROJECTS = ["Internal", "Client A", "Client B", "Research", "Admin"];

function statusBadge(status: SheetStatus) {
  const colors: Record<SheetStatus, string> = {
    DRAFT: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
    SUBMITTED: "bg-amber-50 text-amber-600",
    APPROVED: "bg-emerald-50 text-emerald-600",
  };
  return colors[status];
}

export default function TimesheetsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [hours, setHours] = useState<Record<string, number>>({});
  const [timeEntries, setTimeEntries] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<SheetStatus>("DRAFT");

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekLabel = `${weekDays[0].date} - ${weekDays[6].date}`;

  const loadEntries = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/time-leave/entries", { headers });
      if (res.ok) {
        const data = await res.json();
        const entries: ContextEntry[] = data.entries ?? [];
        setTimeEntries(entries);
        const h: Record<string, number> = {};
        entries.forEach((e) => {
          const v = e.value as { project?: string; date?: string; hours?: number; duration?: number };
          const proj = v.project ?? "Internal";
          const date = v.date;
          if (date) h[`${proj}-${date}`] = v.hours ?? (v.duration ? v.duration / 60 : 0);
        });
        setHours(h);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  function setCell(project: string, iso: string, val: number) {
    setHours((prev) => ({ ...prev, [`${project}-${iso}`]: Math.min(24, Math.max(0, val)) }));
  }

  async function saveTimesheet() {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      for (const [key, val] of Object.entries(hours)) {
        if (val <= 0) continue;
        const lastDash = key.lastIndexOf("-");
        const secondLast = key.lastIndexOf("-", lastDash - 1);
        const thirdLast = key.lastIndexOf("-", secondLast - 1);
        const project = key.substring(0, thirdLast);
        const isoDate = key.substring(thirdLast + 1);
        await fetch("/api/v1/time-leave/entries", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ project, date: isoDate, duration: Math.round(val * 60), notes: "Timesheet entry" }),
        });
      }
      await loadEntries();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function submitTimesheet() {
    await saveTimesheet();
    setSheetStatus("SUBMITTED");
  }

  // Compute totals
  const projectTotals = useMemo(() => {
    const t: Record<string, number> = {};
    PROJECTS.forEach((p) => {
      t[p] = weekDays.reduce((s, d) => s + (hours[`${p}-${d.iso}`] ?? 0), 0);
    });
    return t;
  }, [hours, weekDays]);

  const dayTotals = useMemo(() => {
    const t: Record<string, number> = {};
    weekDays.forEach((d) => {
      t[d.iso] = PROJECTS.reduce((s, p) => s + (hours[`${p}-${d.iso}`] ?? 0), 0);
    });
    return t;
  }, [hours, weekDays]);

  const grandTotal = Object.values(projectTotals).reduce((s, v) => s + v, 0);

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
        <TimeLeaveNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Timesheets</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Weekly timesheet for {weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", statusBadge(sheetStatus))}>{sheetStatus}</span>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Prev Week</button>
          <button onClick={() => setWeekOffset(0)} className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors", weekOffset === 0 ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]")}>This Week</button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Next Week</button>
        </div>

        {/* Timesheet Grid */}
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden mb-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 w-40">Project</th>
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
                {PROJECTS.map((project) => (
                  <tr key={project} className="hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{project}</td>
                    {weekDays.map((d) => (
                      <td key={d.iso} className="text-center px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          value={hours[`${project}-${d.iso}`] ?? ""}
                          onChange={(e) => setCell(project, d.iso, parseFloat(e.target.value) || 0)}
                          placeholder="--"
                          disabled={sheetStatus === "APPROVED"}
                          className="w-14 h-8 text-center text-sm border border-[var(--border)] rounded-md bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                        />
                      </td>
                    ))}
                    <td className="text-center px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{productTotalDisplay(projectTotals[project])}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-[var(--bg-base)] font-semibold">
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)]">Total</td>
                  {weekDays.map((d) => (
                    <td key={d.iso} className="text-center px-2 py-3 text-sm text-[var(--text-primary)]">{productTotalDisplay(dayTotals[d.iso])}</td>
                  ))}
                  <td className="text-center px-4 py-3 text-sm text-[var(--accent)]">{productTotalDisplay(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={saveTimesheet} disabled={saving || sheetStatus === "APPROVED"} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button onClick={submitTimesheet} disabled={saving || sheetStatus === "APPROVED"} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
            Submit Timesheet
          </button>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}

function productTotalDisplay(val: number): string {
  return val > 0 ? `${val}h` : "--";
}
