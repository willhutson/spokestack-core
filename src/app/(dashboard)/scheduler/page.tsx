"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { SchedulerNav } from "./SchedulerNav";
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

/* ------------------------------------------------------------------ */
/*  Calendar helpers                                                   */
/* ------------------------------------------------------------------ */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday-based (Mon=0)
  return day === 0 ? 6 : day - 1;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function SchedulerCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [appointments, setAppointments] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const toDay = getDaysInMonth(year, month);
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(toDay).padStart(2, "0")}`;
      const res = await fetch(
        `/api/v1/scheduler/appointments?from=${from}&to=${to}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.entries ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const appointmentsByDay = useMemo(() => {
    const map: Record<number, ContextEntry[]> = {};
    for (const a of appointments) {
      const d = (a.value.date as string) || "";
      const dayNum = parseInt(d.split("-")[2], 10);
      if (!isNaN(dayNum)) {
        if (!map[dayNum]) map[dayNum] = [];
        map[dayNum].push(a);
      }
    }
    return map;
  }, [appointments]);

  const selectedAppointments = selectedDay
    ? appointmentsByDay[selectedDay] || []
    : [];

  function prevMonth() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
    setSelectedDay(null);
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today.getDate());
  }

  async function handleCreate() {
    if (!title.trim() || !date) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/scheduler/appointments", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, time, duration }),
      });
      if (res.ok) {
        setTitle("");
        setDate("");
        setTime("09:00");
        setDuration(60);
        setShowForm(false);
        loadData();
      }
    } catch {
      /* silent */
    }
  }

  // Build calendar grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <ModuleLayoutShell moduleType="TIME_LEAVE">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scheduler</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage appointments and schedule.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            {showForm ? "Cancel" : "New Appointment"}
          </button>
        </div>

        <SchedulerNav />

        {/* New Appointment Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Meeting with client"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
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
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || !date}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Save Appointment
              </button>
            </div>
          </div>
        )}

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {MONTH_NAMES[month]} {year}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 animate-pulse">
                <div className="h-64 bg-gray-100 rounded" />
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-gray-100">
                  {DAY_HEADERS.map((d) => (
                    <div
                      key={d}
                      className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                {/* Day Cells */}
                <div className="grid grid-cols-7">
                  {cells.map((day, i) => {
                    const dayAppts = day ? appointmentsByDay[day] || [] : [];
                    return (
                      <button
                        key={i}
                        onClick={() => day && setSelectedDay(day)}
                        disabled={!day}
                        className={cn(
                          "min-h-[80px] p-1 border-b border-r border-gray-100 text-left transition-colors",
                          day ? "hover:bg-indigo-50" : "",
                          selectedDay === day && day
                            ? "bg-indigo-50"
                            : ""
                        )}
                      >
                        {day && (
                          <>
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                                isToday(day)
                                  ? "bg-indigo-600 text-white"
                                  : "text-gray-700"
                              )}
                            >
                              {day}
                            </span>
                            {dayAppts.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {dayAppts.slice(0, 2).map((a) => (
                                  <div
                                    key={a.id}
                                    className="px-1 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 truncate"
                                  >
                                    {a.key}
                                  </div>
                                ))}
                                {dayAppts.length > 2 && (
                                  <span className="text-xs text-gray-400 px-1">
                                    +{dayAppts.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Day Detail Panel */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {selectedDay
                ? `${MONTH_NAMES[month]} ${selectedDay}`
                : "Select a day"}
            </h3>
            {selectedDay ? (
              selectedAppointments.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl px-5 py-8 text-center text-xs text-gray-400">
                  No appointments.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedAppointments.map((a) => (
                    <div
                      key={a.id}
                      className="bg-white border border-gray-200 rounded-xl p-3"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {a.key}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(a.value.time as string) || "09:00"} --{" "}
                        {(a.value.duration as number) || 60} min
                      </p>
                      {a.value.location && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {a.value.location as string}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl px-5 py-8 text-center text-xs text-gray-400">
                Click a day to view appointments.
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
