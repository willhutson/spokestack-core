"use client";

import { useState, useEffect } from "react";
import TaskCard, { type Task } from "./components/task-card";
import TaskForm from "./components/task-form";
import TaskActions from "./components/task-actions";
import { openChatWithContext } from "@/lib/chat-event";
import { createClient } from "@/lib/supabase/client";

type Column = { key: Task["status"]; label: string };

const COLUMNS: Column[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch("/api/v1/tasks");
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks ?? data ?? []);
        }
      } catch {
        // API not yet available — show empty state
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  async function handleCreateTask(formData: {
    title: string;
    description: string;
    assignee: string;
    dueDate: string;
    priority: string;
    listName: string;
  }) {
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          assignee: formData.assignee || undefined,
          dueDate: formData.dueDate || undefined,
          priority: formData.priority,
          status: "todo",
          listName: formData.listName || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [...prev, created]);
      }
    } catch {
      // handle error
    }
    setShowForm(false);
  }

  function tasksByStatus(status: Task["status"]): Task[] {
    return tasks.filter((t) => t.status === status);
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} across all lists
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openChatWithContext("Summarize my current tasks and priorities")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            Agent Summary
          </button>
          <button
            onClick={async () => {
              const supabase = createClient();
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                await fetch("/api/v1/mission-control", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3" />
            </svg>
            Send to Canvas
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-400">Loading tasks...</div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.key);
            return (
              <div key={col.key} className="flex flex-col bg-gray-100 rounded-xl">
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                    <span className="text-xs font-medium text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
                      {colTasks.length}
                    </span>
                  </div>
                  {col.key === "todo" && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-xs text-gray-400">No tasks</p>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div key={task.id} className="relative group">
                        <TaskCard task={task} />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TaskActions task={task} onAskAgent={openChatWithContext} />
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

      {/* Task form modal */}
      {showForm && (
        <TaskForm onSubmit={handleCreateTask} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
}
