"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { PublisherNav } from "../PublisherNav";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface DraftPost {
  id: string;
  key: string;
  content: string;
  platforms: string[];
  status: string;
  createdAt: string;
}

const PLATFORMS = ["Facebook", "LinkedIn", "Instagram", "X", "TikTok"];
const PLAT_COLORS: Record<string, string> = {
  Facebook: "bg-blue-100 text-blue-700",
  LinkedIn: "bg-sky-100 text-sky-700",
  Instagram: "bg-pink-100 text-pink-700",
  X: "bg-gray-200 text-gray-700",
  TikTok: "bg-purple-100 text-purple-700",
};

export default function DraftsPage() {
  const [posts, setPosts] = useState<DraftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("09:00");

  // New draft form
  const [showNew, setShowNew] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newPlatforms, setNewPlatforms] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/social-publishing/posts?status=Draft", { headers });
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

  const togglePlatform = (p: string) =>
    setNewPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const saveDraft = async () => {
    if (!newContent.trim() || newPlatforms.length === 0) return;
    const headers = await getAuthHeaders();
    await fetch("/api/v1/social-publishing/posts", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent, platforms: newPlatforms, status: "Draft" }),
    });
    setShowNew(false);
    setNewContent("");
    setNewPlatforms([]);
    load();
  };

  const saveEdit = async (post: DraftPost) => {
    const headers = await getAuthHeaders();
    await fetch("/api/v1/context", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        entryType: "STRUCTURED",
        category: "social_post",
        key: post.key,
        value: { content: editContent, platforms: post.platforms, scheduledFor: "", status: "Draft" },
      }),
    });
    setEditingId(null);
    setEditContent("");
    load();
  };

  const schedulePost = async (post: DraftPost) => {
    if (!schedDate) return;
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
          scheduledFor: `${schedDate}T${schedTime}:00`,
          status: "Scheduled",
        },
      }),
    });
    setScheduleId(null);
    setSchedDate("");
    setSchedTime("09:00");
    load();
  };

  const deletePost = async (post: DraftPost) => {
    const headers = await getAuthHeaders();
    await fetch("/api/v1/context", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        entryType: "STRUCTURED",
        category: "social_post",
        key: post.key,
        value: { content: post.content, platforms: post.platforms, scheduledFor: "", status: "Deleted" },
      }),
    });
    load();
  };

  return (
    <ModuleLayoutShell moduleType="SOCIAL_PUBLISHING">
      <div className="p-6 bg-white min-h-full">
        <PublisherNav />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drafts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Unpublished posts you are still working on.
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Draft
          </button>
        </div>

        {/* New Draft inline form */}
        {showNew && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">New Draft</h3>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What would you like to share?"
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Platforms</p>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                      newPlatforms.includes(p) ? PLAT_COLORS[p] : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowNew(false); setNewContent(""); setNewPlatforms([]); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button onClick={saveDraft} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                Save Draft
              </button>
            </div>
          </div>
        )}

        {loading && <div className="text-center py-12 text-sm text-gray-400">Loading...</div>}

        {/* Empty state */}
        {!loading && posts.length === 0 && !showNew && (
          <div className="text-center py-16 border border-gray-200 rounded-xl">
            <svg className="mx-auto w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-sm text-gray-500 mb-2">No drafts yet</p>
            <button onClick={() => setShowNew(true)} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">
              Create your first draft
            </button>
          </div>
        )}

        {/* Draft cards */}
        {!loading && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((p) => (
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
                      <p className="text-sm text-gray-900 mb-2">
                        {p.content.length > 100 ? `${p.content.slice(0, 100)}...` : p.content || "No content"}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {p.platforms.map((pl) => (
                          <span key={pl} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", PLAT_COLORS[pl] ?? "bg-gray-100 text-gray-600")}>
                            {pl}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
                          {p.content.length} chars
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(p.key); setEditContent(p.content); }}
                        className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { setScheduleId(p.key); setSchedDate(""); setSchedTime("09:00"); }}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        Schedule
                      </button>
                      <button
                        onClick={() => deletePost(p)}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Schedule picker */}
                {scheduleId === p.key && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-end gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Date</label>
                      <input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Time</label>
                      <input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                    <button onClick={() => setScheduleId(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800">Cancel</button>
                    <button onClick={() => schedulePost(p)} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700">Confirm</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
