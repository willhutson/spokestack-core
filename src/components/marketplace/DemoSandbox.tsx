"use client";

import { useState } from "react";
import type { ModuleDemo } from "@/lib/marketplace/demo-data";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-600",
  published: "bg-emerald-50 text-emerald-600",
  approved: "bg-emerald-50 text-emerald-600",
  active: "bg-emerald-50 text-emerald-600",
  won: "bg-emerald-50 text-emerald-600",
  up: "bg-emerald-50 text-emerald-600",
  improved: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-600",
  scheduled: "bg-blue-50 text-blue-600",
  "in review": "bg-purple-50 text-purple-600",
  "in production": "bg-blue-50 text-blue-600",
  qualified: "bg-blue-50 text-blue-600",
  negotiation: "bg-amber-50 text-amber-600",
  "proposal sent": "bg-blue-50 text-blue-600",
  draft: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  overdue: "bg-red-50 text-red-600",
  down: "bg-red-50 text-red-600",
  onboarding: "bg-purple-50 text-purple-600",
};

function formatCell(value: unknown, format?: string): string {
  if (value == null || value === "") return "\u2014";
  if (format === "currency") {
    const num = typeof value === "number" ? value : Number(value);
    return isNaN(num)
      ? String(value)
      : new Intl.NumberFormat("en-AE", {
          style: "currency",
          currency: "AED",
        }).format(num);
  }
  if (format === "date") {
    const d = new Date(String(value));
    return isNaN(d.getTime())
      ? String(value)
      : d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  }
  return String(value);
}

interface DemoSandboxProps {
  demo: ModuleDemo;
  isInstalled: boolean;
  onInstall?: () => void;
}

export default function DemoSandbox({
  demo,
  isInstalled,
  onInstall,
}: DemoSandboxProps) {
  const [activeTab, setActiveTab] = useState<"data" | "actions">("data");

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-base)]">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[var(--text-tertiary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
            />
          </svg>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Interactive Preview
          </span>
          <span className="text-[10px] bg-[var(--bg-surface)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full uppercase tracking-wide">
            Sample Data
          </span>
        </div>
        <div className="flex gap-1">
          {(["data", "actions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[var(--accent)] text-[var(--primary-foreground)]"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {tab === "data" ? "Data" : "Actions"}
            </button>
          ))}
        </div>
      </div>

      {/* Data tab */}
      {activeTab === "data" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {demo.columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {demo.sampleRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-[var(--bg-base)] transition-colors"
                >
                  {demo.columns.map((col) => {
                    const val = record[col.key];
                    const formatted = formatCell(val, col.format);
                    if (col.format === "status") {
                      const style =
                        STATUS_STYLES[String(val).toLowerCase()] ??
                        "bg-[var(--bg-surface)] text-[var(--text-secondary)]";
                      return (
                        <td key={col.key} className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}
                          >
                            {formatted}
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap"
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions tab */}
      {activeTab === "actions" && (
        <div className="p-4 space-y-2">
          {demo.actions.map((action) => (
            <div
              key={action.label}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border)]"
            >
              <div>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {action.label}
                </span>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {action.description}
                </p>
              </div>
              {isInstalled ? (
                <button className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--primary-foreground)] text-xs font-medium hover:bg-[var(--accent)] transition-colors">
                  Run
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                  Install to use
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Install CTA */}
      {!isInstalled && onInstall && (
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-base)]">
          <button
            onClick={onInstall}
            className="w-full rounded-xl bg-[var(--accent)] text-[var(--primary-foreground)] font-medium py-2.5 text-sm hover:bg-[var(--accent)] transition-colors"
          >
            Install {demo.label} &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
