"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { PublisherNav } from "../PublisherNav";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface ScheduledPost {
  id: string;
  key: string;
  content: string;
  platforms: string[];
  scheduledFor: string;
  status: string;
  createdAt: string;
}

const PLAT_COLORS: Record<string, string> = {
  Facebook: "bg-blue-100 text-blue-700",
  LinkedIn: "bg-sky-100 text-sky-700",
  Instagram: "bg-pink-100 text-pink-700",
  X: "bg-gray-200 text-gray-700",
  TikTok: "bg-purple-100 text-purple-700",
};

function groupByDate(posts: ScheduledPost[]): Record<string, ScheduledPost[]> {
  const groups: Record<string, ScheduledPost[]> = {};
  for (const p of posts) {
    const date = p.scheduledFor ? p.scheduledFor.slice(0, 10) : "Unknown";
    if (!groups[date]) groups[date] = [];
    groups[date].push(p);
  }
  // Sort dates ascending
  const sorted: Record<string, ScheduledPost[]> = {};
  Object.keys(groups)
    .sort()
    .forEach((k) => {
      sorted[k] = groups[k];
    });
  return sorted;
}

export default function ScheduledPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("09:00");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/social-publishing/posts?status=Scheduled&sort=scheduled", { headers });
      if (res.ok) {
        const d = await res.json();
        setPosts(d.posts ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reschedulePost = async (post: ScheduledPost) => {
    if (!reschedDate) return;
    const headers = await getAuthHeaders();
    await fetch("/api/v1/context", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        entryType: "STRUCTURED",
        category: "social_post",
        key: post.key,
        value: {
          content: post.content,
          platforms: post.platforms,
          scheduledFor: `${reschedDate}T${reschedTime}:00`,
          status: "Scheduled",
        },
      }),
    });
    setRescheduleId(null);
    setReschedDate("");
    setReschedTime("09:00");
    load();
  };

  const saveEdit = async (post: ScheduledPost) => {
    const headers = await getAuthHeaders();
    await fetch("/api/v1/context", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        entryType: "STRUCTURED",
        category: "social_post",
        key: post.key,
        value: {
          content: editContent,
          platforms: post.platforms,
          scheduledFor: post.scheduledFor,
          status: "Scheduled",
        },
      }),
    });
    setEditingId(null);
    setEditContent("");
    load();
  };

  const removePost = async (post: ScheduledPost) => {
    const headers = await getAuthHeaders();
    await fetch("/api/v1/context", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        entryType: "STRUCTURED",
        category: "social_post",
        key: post.key,
        value: {
          content: post.content,
          platforms: post.platforms,
          scheduledFor: post.scheduledFor,
          status: "Draft",
        },
      }),
    });
    load();
  };

  const grouped = groupByDate(posts);

  return (
    <ModuleLayoutShell moduleType="SOCIAL_PUBLISHING">
      <div className="p-6 bg-white min-h-full">
        <PublisherNav />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Scheduled
              {!loading && posts.length > 0 && (
                <span className="ml-2 text-base font-normal text-gray-400">
                  ({posts.length} post{posts.length !== 1 ? "s" : ""})
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Posts scheduled for future publishing.</p>
          </div>
        </div>

        {loading && <div className="text-center py-12 text-sm text-gray-400">Loading...</div>}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16 border border-gray-200 rounded-xl">
            <svg className="mx-auto w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="text-sm text-gray-500 mb-1">No scheduled posts</p>
            <p className="text-xs text-gray-400">Schedule drafts to see them here.</p>
          </div>
        )}

        {/* Timeline grouped by date */}
        {!loading && posts.length > 0 && (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, datePosts]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <div className="ml-4 border-l-2 border-blue-100 pl-4 space-y-3">
                  {datePosts.map((p) => (
                    <div key={p.key} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                      {editingId === p.key ? (
                        <div>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800">Cancel</button>
                            <button onClick={() => saveEdit(p)} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {p.platforms.map((pl) => (
                                <span key={pl} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", PLAT_COLORS[pl] ?? "bg-gray-100 text-gray-600")}>
                                  {pl}
                                </span>
                              ))}
                            </div>
                            <p className="text-sm text-gray-900 mb-1">
                              {p.content.length > 100 ? `${p.content.slice(0, 100)}...` : p.content || "No content"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {p.scheduledFor
                                ? new Date(p.scheduledFor).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                                : "No time set"}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => { setRescheduleId(p.key); setReschedDate(""); setReschedTime("09:00"); }}
                              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => { setEditingId(p.key); setEditContent(p.content); }}
                              className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removePost(p)}
                              className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Reschedule picker */}
                      {rescheduleId === p.key && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-end gap-3">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Date</label>
                            <input type="date" value={reschedDate} onChange={(e) => setReschedDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Time</label>
                            <input type="time" value={reschedTime} onChange={(e) => setReschedTime(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                          </div>
                          <button onClick={() => setRescheduleId(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800">Cancel</button>
                          <button onClick={() => reschedulePost(p)} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700">Confirm</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
