"use client";

import { useState } from "react";

export interface ToolAuditEntry {
  categoryId: string;
  currentTool: string;
  dataVolume: "none" | "some" | "a lot" | "";
  painPoints: string;
}

interface ToolAuditProps {
  onSubmit: (entries: ToolAuditEntry[]) => void;
  isSubmitting?: boolean;
}

const TOOL_CATEGORIES = [
  {
    id: "tasks",
    label: "Task Management",
    examples: "Asana, Monday.com, Trello, Notion",
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    id: "projects",
    label: "Project Management",
    examples: "Basecamp, Monday.com, MS Project",
    icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z",
  },
  {
    id: "crm",
    label: "Sales / CRM",
    examples: "HubSpot, Salesforce, Pipedrive",
    icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
  },
  {
    id: "content",
    label: "Content / Creative",
    examples: "Canva, Figma, Google Drive, Dropbox",
    icon: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75z",
  },
  {
    id: "communication",
    label: "Team Communication",
    examples: "Slack, WhatsApp, Teams, Email",
    icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  },
  {
    id: "finance",
    label: "Finance / Invoicing",
    examples: "Xero, QuickBooks, FreshBooks",
    icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    id: "time",
    label: "Time Tracking",
    examples: "Toggl, Harvest, Clockify",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    id: "social",
    label: "Social Media",
    examples: "Hootsuite, Buffer, Later",
    icon: "M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z",
  },
];

const DATA_VOLUME_OPTIONS = [
  { value: "none", label: "None / just starting" },
  { value: "some", label: "Some data" },
  { value: "a lot", label: "A lot of data" },
];

export default function ToolAudit({
  onSubmit,
  isSubmitting = false,
}: ToolAuditProps) {
  const [entries, setEntries] = useState<Record<string, ToolAuditEntry>>(
    Object.fromEntries(
      TOOL_CATEGORIES.map((c) => [
        c.id,
        { categoryId: c.id, currentTool: "", dataVolume: "" as const, painPoints: "" },
      ])
    )
  );

  const update = (
    categoryId: string,
    field: keyof ToolAuditEntry,
    value: string
  ) => {
    setEntries((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], [field]: value },
    }));
  };

  const handleSubmit = () => {
    const filled = Object.values(entries).filter(
      (e) => e.currentTool.trim() !== ""
    );
    onSubmit(filled);
  };

  const filledCount = Object.values(entries).filter(
    (e) => e.currentTool.trim() !== ""
  ).length;

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Quick Tool Audit
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Tell us what you currently use. We&apos;ll map everything to SpokeStack
          for you.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TOOL_CATEGORIES.map((cat) => {
          const entry = entries[cat.id];
          return (
            <div
              key={cat.id}
              className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-gray-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={cat.icon}
                  />
                </svg>
                <span className="text-sm font-medium text-gray-900">
                  {cat.label}
                </span>
              </div>

              <input
                type="text"
                placeholder={cat.examples}
                value={entry.currentTool}
                onChange={(e) =>
                  update(cat.id, "currentTool", e.target.value)
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />

              {entry.currentTool.trim() !== "" && (
                <>
                  <select
                    value={entry.dataVolume}
                    onChange={(e) =>
                      update(cat.id, "dataVolume", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">How much data?</option>
                    {DATA_VOLUME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  <textarea
                    placeholder="Any pain points? (optional)"
                    value={entry.painPoints}
                    onChange={(e) =>
                      update(cat.id, "painPoints", e.target.value)
                    }
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || filledCount === 0}
        className="w-full rounded-xl bg-indigo-600 text-white font-medium py-3 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {isSubmitting
          ? "Saving..."
          : filledCount > 0
            ? `Show My Migration Plan (${filledCount} tool${filledCount !== 1 ? "s" : ""}) \u2192`
            : "Fill in at least one tool to continue"}
      </button>
    </div>
  );
}
