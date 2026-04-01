"use client";

import type { ToolAuditEntry } from "./ToolAudit";
import {
  resolveModule,
  resolveToolMapping,
  type ModuleInfo,
} from "@/lib/onboarding/tool-module-map";

interface MigrationItem {
  fromTool: string;
  module: ModuleInfo;
  status: "ready" | "install" | "coming_soon" | "unknown";
  nangoProvider?: string;
}

interface MigrationPlanProps {
  entries: ToolAuditEntry[];
  onInstallModules: (moduleTypes: string[]) => void;
  isInstalling?: boolean;
}

function buildPlan(entries: ToolAuditEntry[]): MigrationItem[] {
  const seen = new Set<string>();
  const items: MigrationItem[] = [];

  for (const entry of entries) {
    if (!entry.currentTool.trim()) continue;
    const module = resolveModule(entry.currentTool);
    if (!module) continue;
    if (seen.has(module.id)) continue;
    seen.add(module.id);

    const status: MigrationItem["status"] =
      module.status === "core"
        ? "ready"
        : module.status === "marketplace"
          ? "install"
          : "coming_soon";

    const mapping = resolveToolMapping(entry.currentTool);
    items.push({
      fromTool: entry.currentTool,
      module,
      status,
      nangoProvider: mapping?.nangoProvider,
    });
  }

  return items;
}

export default function MigrationPlan({
  entries,
  onInstallModules,
  isInstalling = false,
}: MigrationPlanProps) {
  const plan = buildPlan(entries);
  const toInstall = plan
    .filter((i) => i.status === "install")
    .map((i) => i.module.id);

  if (plan.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No tools matched our modules. You&apos;re all set to start fresh!
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Your Migration Plan
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s how your current stack maps to SpokeStack.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {plan.map((item) => (
          <div
            key={item.module.id}
            className="flex items-center gap-3 px-4 py-3"
          >
            {/* Status icon */}
            {item.status === "ready" && (
              <svg
                className="w-4 h-4 text-emerald-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {item.status === "install" && (
              <svg
                className="w-4 h-4 text-amber-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {item.status === "coming_soon" && (
              <svg
                className="w-4 h-4 text-gray-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}

            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-900">
                {item.fromTool}{" "}
                <span className="text-gray-400">&rarr;</span>{" "}
                {item.module.label}
              </span>
            </div>

            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                item.status === "ready"
                  ? "bg-emerald-50 text-emerald-600"
                  : item.status === "install"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {item.status === "ready"
                ? "Ready to use"
                : item.status === "install"
                  ? "Install from marketplace"
                  : "Coming soon"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {toInstall.length > 0 && (
          <button
            onClick={() => onInstallModules(toInstall)}
            disabled={isInstalling}
            className="flex-1 rounded-xl bg-indigo-600 text-white font-medium py-3 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isInstalling
              ? "Installing..."
              : `Install ${toInstall.length} Module${toInstall.length > 1 ? "s" : ""} \u2192`}
          </button>
        )}
        {toInstall.length === 0 && (
          <button
            onClick={() => onInstallModules([])}
            className="flex-1 rounded-xl bg-indigo-600 text-white font-medium py-3 text-sm hover:bg-indigo-700 transition-colors"
          >
            Continue to Dashboard &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
