"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/client-auth";

interface TaskCreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUSES = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
];

export default function TaskCreateForm({
  onCreated,
  onCancel,
}: TaskCreateFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("TODO");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError("Title is required.");
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          dueDate: dueDate || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        setSubmitError(`Failed to create task: ${body || res.statusText}`);
        return;
      }

      onCreated();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">New Task</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Title */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Priority & Status row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Date */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {submitError && (
            <p className="text-xs text-red-600 mr-auto">{submitError}</p>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
