"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import TaskCard, { type Task } from "./components/task-card";
import TaskForm from "./components/task-form";
import TaskActions from "./components/task-actions";
import TaskDetailDrawer from "./components/task-detail-drawer";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { createClient } from "@/lib/supabase/client";

type Column = { key: Task["status"]; label: string };

const COLUMNS: Column[] = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE", label: "Done" },
];

type FilterKey = "all" | "high" | "mine" | "due_week";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high", label: "High Priority" },
  { key: "mine", label: "My Tasks" },
  { key: "due_week", label: "Due This Week" },
];

async function getAuthHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [inlineColumn, setInlineColumn] = useState<Task["status"] | null>(null);
  const [inlineValue, setInlineValue] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setCurrentUser(session.user.email);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadTasks() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/tasks", { headers });
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
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          assignee: formData.assignee || undefined,
          dueDate: formData.dueDate || undefined,
          priority: formData.priority,
          status: "TODO",
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

  async function handleInlineCreate(status: Task["status"]) {
    const title = inlineValue.trim();
    if (!title) {
      setInlineColumn(null);
      setInlineValue("");
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify({ title, status, priority: "medium" }),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [...prev, created]);
      }
    } catch {
      // handle error
    }
    setInlineColumn(null);
    setInlineValue("");
  }

  async function handleDeleteTask(task: Task) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/tasks/${task.id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        if (selectedTask?.id === task.id) setSelectedTask(null);
      }
    } catch {
      // handle error
    }
  }

  async function handleDragEnd(result: DropResult) {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as Task["status"];
    const taskId = draggableId;

    // Optimistic update
    const prevTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        // Revert on error
        setTasks(prevTasks);
      }
    } catch {
      // Revert on error
      setTasks(prevTasks);
    }
  }

  function handleDrawerUpdate(updatedTask: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    setSelectedTask(updatedTask);
  }

  function handleDrawerDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  }

  const filterTasks = useCallback(
    (list: Task[]): Task[] => {
      switch (activeFilter) {
        case "high":
          return list.filter(
            (t) => t.priority === "high" || t.priority === "urgent"
          );
        case "mine":
          return currentUser
            ? list.filter(
                (t) =>
                  t.assignee?.toLowerCase() === currentUser.toLowerCase()
              )
            : list;
        case "due_week": {
          const now = new Date();
          const endOfWeek = new Date(now);
          endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
          endOfWeek.setHours(23, 59, 59, 999);
          return list.filter((t) => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate);
            return d >= now && d <= endOfWeek;
          });
        }
        default:
          return list;
      }
    },
    [activeFilter, currentUser]
  );

  function tasksByStatus(status: Task["status"]): Task[] {
    return filterTasks(tasks.filter((t) => t.status === status));
  }

  return (
    <ModuleLayoutShell moduleType="TASKS">
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tasks</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} across all lists
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activeFilter === f.key
                ? "bg-[var(--accent)] text-[var(--primary-foreground)]"
                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-[var(--text-tertiary)]">Loading tasks...</div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus(col.key);
              return (
                <div
                  key={col.key}
                  className="flex flex-col bg-[var(--bg-base)] rounded-xl border border-[var(--border)]"
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {col.label}
                      </h3>
                      <span className="text-xs font-medium text-[var(--text-tertiary)] bg-[var(--bg-surface)] rounded-full px-2 py-0.5">
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setInlineColumn(col.key);
                        setInlineValue("");
                      }}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                      title={`Add task to ${col.label}`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto px-3 pb-3 space-y-2 transition-colors rounded-b-xl ${
                          snapshot.isDraggingOver
                            ? "bg-[var(--accent-subtle)]"
                            : ""
                        }`}
                      >
                        {/* Inline creation input */}
                        {inlineColumn === col.key && (
                          <div className="bg-[var(--bg-base)] border border-[var(--accent)] rounded-lg p-2 shadow-sm">
                            <input
                              type="text"
                              autoFocus
                              value={inlineValue}
                              onChange={(e) => setInlineValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleInlineCreate(col.key);
                                if (e.key === "Escape") {
                                  setInlineColumn(null);
                                  setInlineValue("");
                                }
                              }}
                              onBlur={() => handleInlineCreate(col.key)}
                              placeholder="Task title... (Enter to save)"
                              className="w-full text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none bg-transparent"
                            />
                          </div>
                        )}

                        {colTasks.length === 0 && inlineColumn !== col.key ? (
                          <div className="flex items-center justify-center h-24 border-2 border-dashed border-[var(--border-strong)] rounded-lg">
                            <p className="text-xs text-[var(--text-tertiary)]">No tasks</p>
                          </div>
                        ) : (
                          colTasks.map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`relative group ${
                                    dragSnapshot.isDragging
                                      ? "opacity-90 rotate-1"
                                      : ""
                                  }`}
                                >
                                  <TaskCard
                                    task={task}
                                    onClick={(t) => setSelectedTask(t)}
                                    onDelete={handleDeleteTask}
                                  />
                                  <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TaskActions
                                      task={task}
                                    />
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Task form modal */}
      {showForm && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Task detail drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleDrawerUpdate}
          onDelete={handleDrawerDelete}
        />
      )}
    </div>
    </ModuleLayoutShell>
  );
}
