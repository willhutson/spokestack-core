"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { TimeLeaveNav } from "../TimeLeaveNav";
import { cn } from "@/lib/utils";

interface TimeEntry {
  id: string;
  value: {
    project?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    notes?: string;
    date?: string;
  };
  createdAt: string;
}

const PROJECTS = ["Internal", "Client A", "Client B", "Research", "Admin", "Other"];

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TimerPage() {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [project, setProject] = useState(PROJECTS[0]);
  const [task, setTask] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<string>("");

  // Manual entry state
  const [showManual, setShowManual] = useState(false);
  const [manualProject, setManualProject] = useState(PROJECTS[0]);
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const loadEntries = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/time-leave/entries?date=${today}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [today]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, paused]);

  function handleStart() {
    setRunning(true);
    setPaused(false);
    setElapsed(0);
    startTimeRef.current = new Date().toISOString();
  }

  function handlePause() {
    setPaused((p) => !p);
  }

  async function handleStop() {
    setRunning(false);
    setPaused(false);
    const duration = elapsed;
    setElapsed(0);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/time-leave/entries", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          startTime: startTimeRef.current,
          endTime: new Date().toISOString(),
          duration: Math.round(duration / 60),
          notes: task,
          date: today,
        }),
      });
      setTask("");
      await loadEntries();
    } catch { /* ignore */ }
  }

  async function submitManualEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!manualStart || !manualEnd) return;
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const start = new Date(`${today}T${manualStart}`);
      const end = new Date(`${today}T${manualEnd}`);
      const duration = Math.round((end.getTime() - start.getTime()) / 60000);
      await fetch("/api/v1/time-leave/entries", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          project: manualProject,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration: Math.max(0, duration),
          notes: manualNotes,
          date: today,
        }),
      });
      setManualStart("");
      setManualEnd("");
      setManualNotes("");
      setShowManual(false);
      await loadEntries();
    } catch { /* ignore */ } finally { setSubmitting(false); }
  }

  const totalMinutes = entries.reduce((s, e) => s + (e.value.duration ?? 0), 0);

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
        <TimeLeaveNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Timer</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Track your time in real-time</p>
          </div>
          <button onClick={() => setShowManual(!showManual)} className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
            Manual Entry
          </button>
        </div>

        {/* Active Timer */}
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 mb-6 text-center">
          <div className="text-6xl font-mono font-bold text-[var(--text-primary)] mb-6">{formatElapsed(elapsed)}</div>
          <div className="flex items-center justify-center gap-4 mb-6">
            <select value={project} onChange={(e) => setProject(e.target.value)} className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
              {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="text" value={task} onChange={(e) => setTask(e.target.value)} placeholder="What are you working on?" className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] w-64" />
          </div>
          <div className="flex items-center justify-center gap-3">
            {!running ? (
              <button onClick={handleStart} className="px-6 py-2.5 text-sm font-medium text-[var(--primary-foreground)] bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">Start</button>
            ) : (
              <>
                <button onClick={handlePause} className={cn("px-6 py-2.5 text-sm font-medium rounded-lg transition-colors", paused ? "text-[var(--primary-foreground)] bg-amber-500 hover:bg-amber-600" : "text-amber-700 bg-amber-100 hover:bg-amber-200")}>
                  {paused ? "Resume" : "Pause"}
                </button>
                <button onClick={handleStop} className="px-6 py-2.5 text-sm font-medium text-[var(--primary-foreground)] bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Stop</button>
              </>
            )}
          </div>
        </div>

        {/* Manual Entry Form */}
        {showManual && (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Manual Entry</h2>
            <form onSubmit={submitManualEntry} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project</label>
                <select value={manualProject} onChange={(e) => setManualProject(e.target.value)} className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                  {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                <input type="text" value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Optional notes" className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Time</label>
                <input type="time" value={manualStart} onChange={(e) => setManualStart(e.target.value)} required className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Time</label>
                <input type="time" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} required className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
              <div className="col-span-2">
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
                  {submitting ? "Saving..." : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Today's Log */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Today&apos;s Log</h2>
            <span className="text-xs text-[var(--text-secondary)]">Total: {formatDuration(totalMinutes)}</span>
          </div>
          {loading ? (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-tertiary)]">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">No time entries yet today. Start the timer or add a manual entry.</p>
            </div>
          ) : (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--bg-base)]">
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Project</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Duration</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Notes</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[var(--bg-hover)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{entry.value.project ?? "--"}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatDuration(entry.value.duration ?? 0)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] max-w-[200px] truncate">{entry.value.notes || "--"}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-tertiary)]">
                        {entry.value.startTime ? new Date(entry.value.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
