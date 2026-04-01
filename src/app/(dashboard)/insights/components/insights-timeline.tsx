"use client";

import { useState } from "react";

interface InsightValue {
  title: string;
  body: string;
  sourceCategory: string;
  generatedAt: string;
  sourceEntryCount: number;
}

interface InsightEntry {
  id: string;
  value: InsightValue;
  confidence: number;
  createdAt: string;
}

interface Props {
  insights: InsightEntry[];
  token: string | null;
  onRefresh: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  tasks: "text-blue-600 bg-blue-100",
  projects: "text-purple-600 bg-purple-100",
  briefs: "text-amber-600 bg-amber-100",
  orders: "text-green-600 bg-green-100",
  "cross-functional": "text-indigo-600 bg-indigo-100",
};

export default function InsightsTimeline({
  insights,
  token,
  onRefresh,
}: Props) {
  const [synthesizing, setSynthesizing] = useState(false);
  const [message, setMessage] = useState("");

  async function triggerSynthesis() {
    if (!token) return;
    setSynthesizing(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/context/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(
          `Generated ${data.insightsGenerated} new insights.`
        );
        onRefresh();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } finally {
      setSynthesizing(false);
    }
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          No insights yet. Run synthesis to generate your first weekly report.
        </p>
        <button
          onClick={triggerSynthesis}
          disabled={synthesizing}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {synthesizing ? "Generating..." : "Generate Insights Now"}
        </button>
        {message && (
          <p className="mt-3 text-sm text-gray-600">{message}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4 gap-3 items-center">
        {message && (
          <p className="text-sm text-indigo-600">{message}</p>
        )}
        <button
          onClick={triggerSynthesis}
          disabled={synthesizing}
          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors"
        >
          {synthesizing ? "Generating..." : "Refresh Insights"}
        </button>
      </div>

      <ol className="relative border-l border-gray-200 space-y-6 ml-3">
        {insights.map((entry) => {
          const val = entry.value;
          const colorClass =
            CATEGORY_COLORS[val.sourceCategory] ??
            "text-gray-600 bg-gray-100";
          return (
            <li key={entry.id} className="ml-6">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 ring-8 ring-white">
                <svg
                  className="h-3 w-3 text-indigo-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </span>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${colorClass}`}
                  >
                    {val.sourceCategory}
                  </span>
                  <time className="text-xs text-gray-400">
                    {new Date(val.generatedAt).toLocaleDateString()}
                  </time>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {val.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {val.body}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Based on {val.sourceEntryCount} activity entries
                  &middot; Confidence{" "}
                  {Math.round((entry.confidence ?? 0.7) * 100)}%
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
