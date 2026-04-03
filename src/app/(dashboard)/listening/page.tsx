"use client";

import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface ContextEntry {
  id: string;
  entryType: string;
  category: string;
  key: string;
  value: string;
  confidence?: number;
  sourceAgentType?: string;
  updatedAt: string;
  createdAt: string;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export default function ListeningPage() {
  const [entries, setEntries] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/context?category=client", { headers });
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries ?? []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const entityEntries = entries.filter((e) => e.entryType === "ENTITY");

  function handleSetupMonitor(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    openChatWithContext(`Set up brand monitoring for "${keyword.trim()}"`);
    setKeyword("");
  }

  return (
    <div className="p-6 h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listening</h1>
          <p className="text-sm text-gray-500 mt-0.5">Brand monitoring and sentiment tracking</p>
        </div>
        <button
          onClick={() => openChatWithContext("Set up brand monitoring for my company")}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          Ask Agent
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Set up a monitor */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Set Up a Monitor</h2>
          <form onSubmit={handleSetupMonitor} className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter a brand name or keyword to track..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!keyword.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Track
            </button>
          </form>
        </section>

        {/* Recent Mentions */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Recent Mentions
          </h2>
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : entityEntries.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.788m13.788 0c3.808 3.808 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 mb-1">No brand mentions detected yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                The agent will start tracking mentions as you use SpokeStack.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entityEntries.map((entry) => (
                <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          {entry.entryType}
                        </span>
                        <span className="text-xs text-gray-400">{entry.category}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{entry.key}</p>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{entry.value}</p>
                      {entry.confidence != null && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.round(entry.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{Math.round(entry.confidence * 100)}% confidence</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
                      {new Date(entry.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sentiment Placeholder */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Sentiment Analysis</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-8">
              {/* Mockup pie chart */}
              <div className="flex-shrink-0 relative">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="#86efac" strokeWidth="20"
                    strokeDasharray="104.7 209.4"
                    strokeDashoffset="0"
                    transform="rotate(-90 60 60)"
                  />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="#fde68a" strokeWidth="20"
                    strokeDasharray="62.8 251.3"
                    strokeDashoffset="-104.7"
                    transform="rotate(-90 60 60)"
                  />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="#fca5a5" strokeWidth="20"
                    strokeDasharray="46.1 268.1"
                    strokeDashoffset="-167.5"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-400 bg-white rounded-full px-1">sample</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Coming soon
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-green-300" />
                    <span className="text-sm text-gray-700 flex-1">Positive</span>
                    <span className="text-sm text-gray-400">&mdash;</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-yellow-300" />
                    <span className="text-sm text-gray-700 flex-1">Neutral</span>
                    <span className="text-sm text-gray-400">&mdash;</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-300" />
                    <span className="text-sm text-gray-700 flex-1">Negative</span>
                    <span className="text-sm text-gray-400">&mdash;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
