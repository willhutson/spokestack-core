"use client";

import { useState } from "react";

interface StepProps {
  data: Record<string, unknown>;
  updateData: (updates: Record<string, unknown>) => void;
}

interface Role {
  title: string;
  department?: string;
}

interface Department {
  name: string;
}

const SUGGESTED_ROLES = [
  "Creative Director", "Project Manager", "Account Manager", "Strategist",
  "Designer", "Copywriter", "Developer", "Media Planner", "Analyst", "Producer",
];

export function Step4Roles({ data, updateData }: StepProps) {
  const roles = (data.roles as Role[]) ?? [];
  const departments = (data.departments as Department[]) ?? [];
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("");

  const addRole = (title: string, department?: string) => {
    if (!title.trim() || roles.some((r) => r.title === title)) return;
    updateData({ roles: [...roles, { title: title.trim(), department }] });
    setNewTitle("");
    setNewDept("");
  };

  const removeRole = (index: number) => {
    updateData({ roles: roles.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-[var(--text-primary)]">Roles</h2>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Define the roles in your organization.
      </p>

      {/* Suggestions */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Suggestions</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_ROLES.filter((s) => !roles.some((r) => r.title === s)).map((s) => (
            <button
              key={s}
              onClick={() => addRole(s)}
              className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:border-indigo-400 hover:bg-[var(--accent-subtle)]"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* Add custom */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRole(newTitle, newDept || undefined)}
          placeholder="Role title..."
          className="flex-1 rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent)]"
        />
        {departments.length > 0 && (
          <select
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Department</option>
            {departments.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => addRole(newTitle, newDept || undefined)}
          disabled={!newTitle.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--accent)] disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {/* Roles list */}
      <div className="space-y-2">
        {roles.map((role, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">{role.title}</p>
              {role.department && (
                <p className="text-xs text-[var(--text-secondary)]">{role.department}</p>
              )}
            </div>
            <button
              onClick={() => removeRole(i)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
