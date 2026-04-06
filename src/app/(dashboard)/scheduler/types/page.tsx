"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { SchedulerNav } from "../SchedulerNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContextEntry {
  id: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#06b6d4", "#3b82f6",
];

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AppointmentTypesPage() {
  const [types, setTypes] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [active, setActive] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/scheduler/types", { headers });
      if (res.ok) {
        const data = await res.json();
        setTypes(data.entries ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/scheduler/types", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name, duration, description, color, active }),
      });
      if (res.ok) {
        setName("");
        setDuration(30);
        setDescription("");
        setColor("#6366f1");
        setActive(true);
        setShowForm(false);
        loadData();
      }
    } catch {
      /* silent */
    }
  }

  function handleToggle(id: string) {
    setTypes((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, value: { ...t.value, active: !t.value.active } }
          : t
      )
    );
  }

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Scheduler</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage appointment types and durations.
          </p>
        </div>

        <SchedulerNav />

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Appointment Types
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            {showForm ? "Cancel" : "New Type"}
          </button>
        </div>

        {/* New Type Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Discovery Call"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this appointment type"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Color
              </label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      color === c
                        ? "border-gray-900 scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Active
              </label>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Save Type
              </button>
            </div>
          </div>
        )}

        {/* Types List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
              >
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : types.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">
            No appointment types configured.
          </div>
        ) : (
          <div className="space-y-3">
            {types.map((t) => {
              const dur = (t.value.duration as number) || 30;
              const desc = (t.value.description as string) || "";
              const col = (t.value.color as string) || "#6366f1";
              const isActive = t.value.active as boolean;
              const durLabel =
                dur >= 60
                  ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ""}`
                  : `${dur}m`;

              return (
                <div
                  key={t.id}
                  className={cn(
                    "bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 transition-all hover:border-gray-300",
                    !isActive && "opacity-60"
                  )}
                >
                  {/* Color Swatch */}
                  <div
                    className="w-10 h-10 rounded-lg shrink-0"
                    style={{ backgroundColor: col }}
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {t.key}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {durLabel}
                      </span>
                    </div>
                    {desc && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {desc}
                      </p>
                    )}
                  </div>

                  {/* Active Toggle */}
                  <button
                    onClick={() => handleToggle(t.id)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative shrink-0",
                      isActive ? "bg-indigo-600" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        isActive ? "left-5" : "left-0.5"
                      )}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
