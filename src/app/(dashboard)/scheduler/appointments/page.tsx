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

type FilterTab = "upcoming" | "past" | "cancelled";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

const TYPE_ICONS: Record<string, string> = {
  meeting: "M",
  call: "C",
  interview: "I",
  review: "R",
  general: "G",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AppointmentsListPage() {
  const [appointments, setAppointments] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("upcoming");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/scheduler/appointments", { headers });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.entries ?? []);
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

  const now = new Date().toISOString().split("T")[0];

  const filtered = appointments.filter((a) => {
    const dateStr = (a.value.date as string) || "";
    const status = (a.value.status as string) || "PENDING";
    if (filter === "cancelled") return status === "CANCELLED";
    if (filter === "past")
      return dateStr < now && status !== "CANCELLED";
    // upcoming
    return dateStr >= now && status !== "CANCELLED";
  });

  function handleCancel(id: string) {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, value: { ...a.value, status: "CANCELLED" } }
          : a
      )
    );
  }

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Scheduler</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View and manage all appointments.
          </p>
        </div>

        <SchedulerNav />

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(["upcoming", "past", "cancelled"] as FilterTab[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                filter === f
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
            <div className="h-4 w-48 bg-gray-200 rounded mb-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded mb-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">
            No {filter} appointments.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Title
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Attendees
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Date & Time
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Duration
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Location
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((appt) => {
                  const type = (appt.value.type as string) || "general";
                  const attendees = (appt.value.attendees as string[]) || [];
                  const dateStr = (appt.value.date as string) || "";
                  const timeStr = (appt.value.time as string) || "";
                  const dur = (appt.value.duration as number) || 60;
                  const loc = (appt.value.location as string) || "--";
                  const status = (appt.value.status as string) || "PENDING";
                  const canCancel =
                    status !== "CANCELLED" && status !== "COMPLETED";

                  return (
                    <tr key={appt.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                          {TYPE_ICONS[type] || "G"}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {appt.key}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {attendees.length > 0
                          ? attendees.join(", ")
                          : "--"}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {dateStr} {timeStr}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">
                        {dur >= 60
                          ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ""}`
                          : `${dur}m`}
                      </td>
                      <td className="px-5 py-3 text-gray-600 max-w-xs truncate">
                        {loc}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            STATUS_COLORS[status] ||
                              STATUS_COLORS.PENDING
                          )}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {canCancel && (
                          <button
                            onClick={() => handleCancel(appt.id)}
                            className="px-3 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Cancel
                          </button>
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
    </ModuleLayoutShell>
  );
}
