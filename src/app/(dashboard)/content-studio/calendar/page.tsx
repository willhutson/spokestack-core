"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { StudioNav } from "../StudioNav";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface CalendarItem {
  id: string;
  key: string;
  category: string;
  date: string;
  type: string;
  platform: string | null;
  status: string;
  title: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_DOT: Record<string, string> = {
  draft: "bg-gray-400",
  scheduled: "bg-blue-500",
  published: "bg-emerald-500",
};

const TYPE_ICON: Record<string, string> = {
  social_post: "\u{1F4F1}",
  brief: "\u{1F4CB}",
  deck: "\u{1F4CA}",
};

const PLATFORM_ICON: Record<string, string> = {
  instagram: "\u{1F4F7}",
  twitter: "\u{1F426}",
  linkedin: "\u{1F4BC}",
  youtube: "\u{25B6}\u{FE0F}",
  tiktok: "\u{1F3B5}",
};

const PLATFORMS = ["all", "instagram", "twitter", "linkedin", "youtube", "tiktok"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  // Monday = 0 ... Sunday = 6
  const startDow = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthLabel(year: number, month: number) {
  return new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [platform, setPlatform] = useState("all");

  const weeks = useMemo(() => getMonthGrid(year, month), [year, month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const from = new Date(year, month, 1).toISOString();
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(`/api/v1/content-studio/calendar?from=${from}&to=${to}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => platform === "all" ? items : items.filter((i) => i.platform === platform),
    [items, platform]
  );

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    filtered.forEach((item) => {
      const key = item.date.slice(0, 10);
      (map[key] ??= []).push(item);
    });
    return map;
  }, [filtered]);

  const todayKey = dateKey(new Date());

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDay(null);
  }

  const selectedItems = selectedDay ? (itemsByDate[selectedDay] ?? []) : [];

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <StudioNav />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plan and track your content schedule.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">&larr; Prev</button>
        <h2 className="text-lg font-semibold text-gray-900">{monthLabel(year, month)}</h2>
        <button onClick={nextMonth} className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Next &rarr;</button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-xs font-medium text-gray-500 text-center py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[100px] bg-gray-50 rounded-lg" />;
              const key = dateKey(day);
              const dayItems = itemsByDate[key] ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDay;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={cn(
                    "min-h-[100px] bg-white border rounded-lg p-2 cursor-pointer hover:border-gray-300 transition-colors",
                    isToday && "border-indigo-300 ring-1 ring-indigo-100",
                    isSelected && "border-indigo-500 ring-2 ring-indigo-200",
                    !isToday && !isSelected && "border-gray-200"
                  )}
                >
                  <div className={cn("text-sm font-medium mb-1", isToday ? "text-indigo-600" : "text-gray-700")}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-1 text-xs truncate">
                        <span>{TYPE_ICON[item.type] ?? ""}</span>
                        {item.platform && <span className="text-gray-400">{PLATFORM_ICON[item.platform] ?? ""}</span>}
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_DOT[item.status] ?? "bg-gray-400")} />
                        <span className="truncate text-gray-600">{item.title}</span>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-xs text-gray-400">+{dayItems.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h3>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-gray-500">No content scheduled for this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-lg">{TYPE_ICON[item.type] ?? ""}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-500">
                          {item.category}{item.platform ? ` \u00b7 ${item.platform}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[item.status] ?? "bg-gray-400")} />
                        <span className="text-xs text-gray-600 capitalize">{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </ModuleLayoutShell>
  );
}
