"use client";

import { useState } from "react";

interface StepProps {
  data: Record<string, unknown>;
  updateData: (updates: Record<string, unknown>) => void;
}

interface Department {
  name: string;
  lead?: string;
}

const SUGGESTED = ["Creative", "Strategy", "Accounts", "Media", "Production", "Operations", "Engineering", "Sales"];

export function Step3Departments({ data, updateData }: StepProps) {
  const departments = (data.departments as Department[]) ?? [];
  const [newName, setNewName] = useState("");

  const addDepartment = (name: string) => {
    if (!name.trim() || departments.some((d) => d.name === name)) return;
    updateData({ departments: [...departments, { name: name.trim() }] });
    setNewName("");
  };

  const removeDepartment = (index: number) => {
    updateData({ departments: departments.filter((_, i) => i !== index) });
  };

  const updateLead = (index: number, lead: string) => {
    const updated = departments.map((d, i) => (i === index ? { ...d, lead } : d));
    updateData({ departments: updated });
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-[var(--text-primary)]">Departments</h2>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Set up your departments. Click suggestions or add your own.
      </p>

      {/* Suggestions */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Suggestions</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.filter((s) => !departments.some((d) => d.name === s)).map((s) => (
            <button
              key={s}
              onClick={() => addDepartment(s)}
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
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addDepartment(newName)}
          placeholder="Add a department..."
          className="flex-1 rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={() => addDepartment(newName)}
          disabled={!newName.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--accent)] disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {/* Department list */}
      <div className="space-y-3">
        {departments.map((dept, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">{dept.name}</p>
              <input
                type="text"
                value={dept.lead ?? ""}
                onChange={(e) => updateLead(i, e.target.value)}
                placeholder="Department lead (optional)"
                className="mt-1 w-full bg-transparent text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-tertiary)] outline-none"
              />
            </div>
            <button
              onClick={() => removeDepartment(i)}
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
