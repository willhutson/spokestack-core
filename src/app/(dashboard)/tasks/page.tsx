"use client";

import { useState, useEffect } from "react";
import TaskCard, { type Task } from "./components/task-card";
import TaskForm from "./components/task-form";

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} across all lists
          </p>
        </div>
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
                    colTasks.map((task) => <TaskCard key={task.id} task={task} />)
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
