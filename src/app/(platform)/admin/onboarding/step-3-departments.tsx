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
      <h2 className="mb-1 text-xl font-bold text-gray-900">Departments</h2>
      <p className="mb-6 text-sm text-gray-500">
        Set up your departments. Click suggestions or add your own.
      </p>

      {/* Suggestions */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Suggestions</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.filter((s) => !departments.some((d) => d.name === s)).map((s) => (
            <button
              key={s}
              onClick={() => addDepartment(s)}
              className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
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
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => addDepartment(newName)}
          disabled={!newName.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {/* Department list */}
      <div className="space-y-3">
        {departments.map((dept, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{dept.name}</p>
              <input
                type="text"
                value={dept.lead ?? ""}
                onChange={(e) => updateLead(i, e.target.value)}
                placeholder="Department lead (optional)"
                className="mt-1 w-full bg-transparent text-xs text-gray-600 placeholder:text-gray-400 outline-none"
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
