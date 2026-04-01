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
import SetupChecklist from "@/components/setup/SetupChecklist";
import { openChatWithContext } from "@/lib/chat-event";
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
  const [showSetup, setShowSetup] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem("spokestack_setup_dismissed");
    if (dismissed === "true") return;

    // Check DB flag before showing checklist
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const authHeaders = { Authorization: `Bearer ${session.access_token}` };

      fetch("/api/v1/settings", { headers: authHeaders })
        .then((r) => r.json())
        .then((data) => {
          const settings = data.settings ?? data;
          if (settings?.onboardingComplete) {
            localStorage.setItem("spokestack_setup_dismissed", "true");
          } else {
            setShowSetup(true);
          }
        })
        .catch(() => {
          // Fallback: if settings endpoint fails, check billing tier
          // Established accounts (non-FREE tier) should not see onboarding
          fetch("/api/v1/billing", { headers: authHeaders })
            .then((r) => r.json())
            .then((data) => {
              if (data.tier && data.tier !== "FREE") {
                localStorage.setItem("spokestack_setup_dismissed", "true");
              } else {
                setShowSetup(true);
              }
            })
            .catch(() => {
              // If both fail, don't show the checklist to avoid broken UX
            });
        });
    });
  }, []);

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
    <div className="p-6 h-full flex flex-col">
      {/* Setup completeness checker */}
      {showSetup && (
        <SetupChecklist
          onDismiss={() => {
            setShowSetup(false);
            localStorage.setItem("spokestack_setup_dismissed", "true");
          }}
        />
      )}

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
            onClick={() =>
              openChatWithContext(
                "Summarize my current tasks and priorities"
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
            Ask Agent
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
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
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-400">Loading tasks...</div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus(col.key);
              return (
                <div
                  key={col.key}
                  className="flex flex-col bg-gray-50 rounded-xl border border-gray-200"
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-700">
                        {col.label}
                      </h3>
                      <span className="text-xs font-medium text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setInlineColumn(col.key);
                        setInlineValue("");
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
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
                            ? "bg-indigo-50"
                            : ""
                        }`}
                      >
                        {/* Inline creation input */}
                        {inlineColumn === col.key && (
                          <div className="bg-white border border-indigo-300 rounded-lg p-2 shadow-sm">
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
                              className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
                            />
                          </div>
                        )}

                        {colTasks.length === 0 && inlineColumn !== col.key ? (
                          <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg">
                            <p className="text-xs text-gray-400">No tasks</p>
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
                                      onAskAgent={openChatWithContext}
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
  );
}
