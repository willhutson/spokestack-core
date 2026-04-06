"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { BoardsNav } from "./BoardsNav";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  taskList?: { id: string; name: string };
}

const COLUMNS: { key: Task["status"]; label: string; color: string }[] = [
  { key: "TODO", label: "To Do", color: "bg-gray-400" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-blue-400" },
  { key: "DONE", label: "Done", color: "bg-green-400" },
];

const TEMPLATES = [
  { name: "Project Board", description: "Track deliverables across project phases", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" },
  { name: "Sprint Board", description: "Agile sprint planning and tracking", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  { name: "Content Pipeline", description: "Manage content from draft to publish", icon: "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5" },
];

function priorityDot(priority?: string) {
  switch (priority?.toUpperCase()) {
    case "URGENT": return "bg-red-400";
    case "HIGH": return "bg-orange-400";
    case "MEDIUM": return "bg-yellow-400";
    case "LOW": return "bg-[var(--bg-hover)]";
    default: return "bg-[var(--bg-hover)]";
  }
}

function SkeletonColumn() {
  return (
    <div className="flex flex-col bg-[var(--bg-base)] rounded-xl border border-[var(--border)] p-3">
      <div className="animate-pulse h-5 bg-[var(--bg-surface)] rounded w-1/2 mb-3" />
      <div className="space-y-2">
        <div className="animate-pulse h-16 bg-[var(--bg-surface)] rounded-lg" />
        <div className="animate-pulse h-16 bg-[var(--bg-surface)] rounded-lg" />
      </div>
    </div>
  );
}

export default function BoardsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "templates">("board");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/tasks", { headers });
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks ?? []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function tasksByStatus(status: Task["status"]) {
    return tasks.filter((t) => t.status === status);
  }

  return (
    <ModuleLayoutShell moduleType="BOARDS">
    <div className="p-6 h-full flex flex-col bg-[var(--bg-base)]">
      <BoardsNav />
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Boards</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Visual collaboration spaces for your team</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openChatWithContext("Create a kanban board for my team.")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            Ask Agent
          </button>
          <button
            onClick={() => router.push("/tasks")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Board
          </button>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setView("board")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            view === "board" ? "bg-[var(--accent)] text-[var(--primary-foreground)]" : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          Active Board
        </button>
        <button
          onClick={() => setView("templates")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            view === "templates" ? "bg-[var(--accent)] text-[var(--primary-foreground)]" : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          Templates
        </button>
      </div>

      {view === "templates" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => router.push("/tasks")}
              className="text-left bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-5 hover:border-[var(--accent)] hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 bg-[var(--accent-subtle)] rounded-lg flex items-center justify-center mb-3 group-hover:bg-[var(--accent-subtle)] transition-colors">
                <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{t.name}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{t.description}</p>
            </button>
          ))}
        </div>
      ) : loading ? (
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
          <SkeletonColumn />
          <SkeletonColumn />
          <SkeletonColumn />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.key);
            return (
              <div key={col.key} className="flex flex-col bg-[var(--bg-base)] rounded-xl border border-[var(--border)]">
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{col.label}</h3>
                    <span className="text-xs font-medium text-[var(--text-tertiary)] bg-[var(--bg-surface)] rounded-full px-2 py-0.5">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-[var(--border-strong)] rounded-lg">
                      <p className="text-xs text-[var(--text-tertiary)]">No items</p>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => router.push("/tasks")}
                        className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--border-strong)] transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-2">
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityDot(task.priority)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {task.taskList && (
                                <span className="text-xs text-[var(--text-tertiary)]">{task.taskList.name}</span>
                              )}
                              {task.dueDate && (
                                <span className="text-xs text-[var(--text-tertiary)]">
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
