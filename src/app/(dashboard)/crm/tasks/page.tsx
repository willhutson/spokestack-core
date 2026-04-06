"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { CrmNav } from "../CrmNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Task {
  id: string;
  title: string;
  type?: string;
  status: string;
  dueDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

type TabFilter = "all" | "overdue" | "completed";

const TAB_FILTERS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)]",
  OVERDUE: "bg-red-50 text-red-600 border-red-200",
};

const TYPE_COLORS: Record<string, string> = {
  follow_up: "bg-blue-50 text-blue-700 border-blue-200",
  meeting: "bg-purple-50 text-purple-700 border-purple-200",
  call: "bg-amber-50 text-amber-700 border-amber-200",
  email: "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]",
  task: "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)]",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (task.status === "COMPLETED" || task.status === "CANCELLED") return false;
  return new Date(task.dueDate) < new Date();
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function CrmTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("all");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/tasks", { headers });
      if (res.ok) {
        const data = await res.json();
        const allTasks: Task[] = data.tasks ?? data.entries ?? [];
        // Filter to CRM-related tasks
        const crmTasks = allTasks.filter(
          (t) =>
            t.metadata?.source === "crm" ||
            (t.metadata as Record<string, unknown>)?.module === "crm"
        );
        setTasks(crmTasks);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "overdue":
        return tasks.filter(isOverdue);
      case "completed":
        return tasks.filter((t) => t.status === "COMPLETED");
      default:
        return tasks;
    }
  }, [tasks, tab]);

  const overdueCount = useMemo(
    () => tasks.filter(isOverdue).length,
    [tasks]
  );
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === "COMPLETED").length,
    [tasks]
  );

  return (
    <ModuleLayoutShell moduleType="CRM">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">CRM Tasks</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Follow-ups, meetings, and CRM-related tasks.
          </p>
        </div>

        <CrmNav />

        {/* Tab filters */}
        <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
          {TAB_FILTERS.map((t) => {
            const count =
              t.key === "overdue"
                ? overdueCount
                : t.key === "completed"
                ? completedCount
                : tasks.length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  tab === t.key
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "ml-1.5 px-1.5 py-0.5 rounded-full text-xs",
                    tab === t.key
                      ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                      : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="px-5 py-4 flex items-center gap-6 border-b border-[var(--border)] last:border-b-0"
              >
                <div className="h-4 w-40 bg-[var(--bg-surface)] rounded" />
                <div className="h-5 w-16 bg-[var(--bg-surface)] rounded-full" />
                <div className="h-4 w-24 bg-[var(--bg-surface)] rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
              {tab === "all"
                ? "No CRM tasks"
                : tab === "overdue"
                ? "No overdue tasks"
                : "No completed tasks"}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {tab === "all"
                ? "CRM-related tasks will appear here when created."
                : "Great job keeping up with your tasks!"}
            </p>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">
                    Title
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">
                    Due Date
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((task) => {
                  const overdue = isOverdue(task);
                  return (
                    <tr
                      key={task.id}
                      className={cn(
                        "hover:bg-[var(--bg-hover)]",
                        overdue && "bg-red-50/30"
                      )}
                    >
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            task.status === "COMPLETED"
                              ? "text-[var(--text-tertiary)] line-through"
                              : "text-[var(--text-primary)]"
                          )}
                        >
                          {task.title}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {task.type ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              TYPE_COLORS[task.type.toLowerCase()] ||
                                TYPE_COLORS.task
                            )}
                          >
                            {task.type}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {task.dueDate ? (
                          <span
                            className={cn(
                              "text-sm",
                              overdue
                                ? "text-red-600 font-medium"
                                : "text-[var(--text-secondary)]"
                            )}
                          >
                            {fmtDate(task.dueDate)}
                            {overdue && (
                              <span className="ml-1 text-xs text-red-500">
                                (overdue)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">
                            No due date
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            overdue
                              ? STATUS_COLORS.OVERDUE
                              : STATUS_COLORS[task.status] ||
                                  STATUS_COLORS.PENDING
                          )}
                        >
                          {overdue ? "OVERDUE" : task.status}
                        </Badge>
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
