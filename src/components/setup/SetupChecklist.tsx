"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  SETUP_CHECKLIST,
  calculateCompleteness,
} from "@/lib/setup/checklist";
import SetupProgress from "./SetupProgress";

const CATEGORY_LABELS: Record<string, string> = {
  profile: "Profile & Branding",
  team: "Team",
  modules: "Modules",
  data: "Get Started",
};

const CATEGORY_ORDER = ["profile", "team", "modules", "data"];
const CACHE_KEY = "spokestack_setup_results";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface SetupChecklistProps {
  onDismiss?: () => void;
}

export default function SetupChecklist({ onDismiss }: SetupChecklistProps) {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORY_ORDER)
  );

  const runChecks = useCallback(async () => {
    setIsLoading(true);

    // Get auth token
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    // Group items by endpoint to avoid duplicate fetches
    const endpointMap = new Map<
      string,
      (typeof SETUP_CHECKLIST)[number][]
    >();
    for (const item of SETUP_CHECKLIST) {
      const existing = endpointMap.get(item.checkEndpoint) ?? [];
      existing.push(item);
      endpointMap.set(item.checkEndpoint, existing);
    }

    const newResults: Record<string, boolean> = {};

    await Promise.allSettled(
      Array.from(endpointMap.entries()).map(
        async ([endpoint, items]) => {
          try {
            const res = await fetch(endpoint, { headers });
            if (!res.ok) {
              items.forEach((item) => {
                newResults[item.id] = false;
              });
              return;
            }
            const data = await res.json();
            items.forEach((item) => {
              try {
                newResults[item.id] = item.checkFn(data);
              } catch {
                newResults[item.id] = false;
              }
            });
          } catch {
            items.forEach((item) => {
              newResults[item.id] = false;
            });
          }
        }
      )
    );

    setResults(newResults);
    setIsLoading(false);

    // Cache results
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ results: newResults, timestamp: Date.now() })
    );
  }, []);

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { results: cachedResults, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setResults(cachedResults);
          setIsLoading(false);
          return;
        }
      } catch {
        // Invalid cache — ignore
      }
    }
    runChecks();
  }, [runChecks]);

  const completeness = calculateCompleteness(results);
  const allDone = completeness === 100;
  const remaining = SETUP_CHECKLIST.filter(
    (i) => !results[i.id]
  ).length;

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const groupedItems = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    items: SETUP_CHECKLIST.filter((item) => item.category === cat),
  })).filter((g) => g.items.length > 0);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <SetupProgress percentage={completeness} size={48} />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {allDone ? "You're all set!" : "Finish setting up"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {allDone
                ? "Your workspace is ready to go."
                : `${completeness}% complete \u2014 ${remaining} step${remaining !== 1 ? "s" : ""} remaining`}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Grouped items */}
      <div className="divide-y divide-gray-50">
        {groupedItems.map((group) => {
          const isExpanded = expandedCategories.has(group.category);
          const groupComplete = group.items.every(
            (i) => results[i.id]
          );

          return (
            <div key={group.category}>
              <button
                onClick={() => toggleCategory(group.category)}
                className="w-full flex items-center gap-2 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-1 text-left">
                  {group.label}
                </span>
                {groupComplete && (
                  <svg
                    className="w-3.5 h-3.5 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                )}
              </button>

              {isExpanded && (
                <div className="pb-2">
                  {group.items.map((item) => {
                    const done = results[item.id];
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 px-5 py-2.5 group"
                      >
                        {/* Check circle */}
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            done
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {done && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Label + description */}
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-sm ${
                              done
                                ? "text-gray-400 line-through"
                                : "text-gray-900"
                            }`}
                          >
                            {item.label}
                          </span>
                          {!done && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Action button (hover) */}
                        {!done && (
                          <button
                            onClick={() =>
                              router.push(item.actionHref)
                            }
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            {item.actionLabel}
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
                                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
