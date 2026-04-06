"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { PublisherNav } from "./PublisherNav";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface ContextEntry { id: string; key: string; value: string; updatedAt: string }
interface Connection { id: string; provider: string; status: string; accountName?: string }
interface SocialPost { key: string; content: string; platforms: string[]; scheduledFor: string; status: string }

const PLATFORMS = ["Facebook", "LinkedIn", "Instagram", "X", "TikTok"];
const PLAT_COLORS: Record<string, string> = {
  Facebook: "bg-blue-100 text-blue-700", LinkedIn: "bg-sky-100 text-sky-700",
  Instagram: "bg-pink-100 text-pink-700", X: "bg-[var(--bg-surface)] text-[var(--text-secondary)]", TikTok: "bg-purple-100 text-purple-700",
};
const PLAT_CAL_COLORS: Record<string, string> = {
  Facebook: "#3b82f6", LinkedIn: "#0ea5e9", Instagram: "#ec4899", X: "#6b7280", TikTok: "#a855f7",
};
const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-[var(--bg-surface)] text-[var(--text-secondary)]", Scheduled: "bg-blue-100 text-blue-700", Published: "bg-green-100 text-green-700",
};

function parsePost(e: ContextEntry): SocialPost {
  try { const v = JSON.parse(e.value); return { key: e.key, content: v.content ?? "", platforms: v.platforms ?? [], scheduledFor: v.scheduledFor ?? "", status: v.status ?? "Draft" }; }
  catch { return { key: e.key, content: "", platforms: [], scheduledFor: "", status: "Draft" }; }
}

export default function SocialPublishingPage() {
  const [tab, setTab] = useState<"queue" | "calendar" | "accounts" | "analytics">("queue");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [selPlatforms, setSelPlatforms] = useState<string[]>([]);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("09:00");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [pRes, cRes] = await Promise.all([
        fetch("/api/v1/context?category=social_post", { headers }),
        fetch("/api/v1/integrations", { headers }),
      ]);
      if (pRes.ok) { const d = await pRes.json(); setPosts((d.entries ?? []).map(parsePost)); }
      if (cRes.ok) { const d = await cRes.json(); setConnections(d.connections ?? d.integrations ?? []); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePost = async (status: string) => {
    if (!content.trim() || selPlatforms.length === 0) return;
    const headers = await getAuthHeaders();
    const scheduledFor = schedDate ? `${schedDate}T${schedTime}:00` : new Date().toISOString();
    await fetch("/api/v1/context", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ entryType: "STRUCTURED", category: "social_post", key: `social_${Date.now()}`, value: { content, platforms: selPlatforms, scheduledFor, status } }) });
    setShowForm(false); setContent(""); setSelPlatforms([]); setSchedDate(""); setSchedTime("09:00");
    load();
  };

  const updatePostStatus = async (p: SocialPost, newStatus: string) => {
    const headers = await getAuthHeaders();
    await fetch("/api/v1/context", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ entryType: "STRUCTURED", category: "social_post", key: p.key, value: { content: p.content, platforms: p.platforms, scheduledFor: p.scheduledFor, status: newStatus } }) });
    load();
  };

  const togglePlatform = (p: string) => setSelPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const calDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const postsByDate: Record<string, SocialPost[]> = {};
  posts.forEach(p => { if (p.scheduledFor) { const d = p.scheduledFor.slice(0, 10); if (!postsByDate[d]) postsByDate[d] = []; postsByDate[d].push(p); } });
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const connectedProviders = new Set(connections.map(c => c.provider?.toLowerCase()));
  const socialProviders = [
    { key: "facebook", label: "Facebook" }, { key: "linkedin", label: "LinkedIn" },
    { key: "instagram", label: "Instagram" }, { key: "twitter", label: "X" }, { key: "tiktok", label: "TikTok" },
  ];

  const tabs = [
    { id: "queue" as const, label: "Queue" }, { id: "calendar" as const, label: "Calendar" },
    { id: "accounts" as const, label: "Accounts" }, { id: "analytics" as const, label: "Analytics" },
  ];

  return (
    <ModuleLayoutShell moduleType="SOCIAL_PUBLISHING">
    <div className="p-6 bg-[var(--bg-base)] min-h-full">
      <PublisherNav />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Social Publishing</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Schedule and publish across social channels.</p>
        </div>
        <button onClick={() => { setShowForm(true); setTab("queue"); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Create Post
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"}`}>{t.label}</button>
        ))}
      </div>

      {loading && <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">Loading...</div>}

      {/* Create Post Form */}
      {!loading && tab === "queue" && showForm && (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Create Post</h3>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What would you like to share?" rows={4}
            className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
          <div className="mb-3">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Platforms</p>
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${selPlatforms.includes(p) ? PLAT_COLORS[p] : "bg-[var(--bg-surface)] text-[var(--text-tertiary)]"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mb-4">
            <div><label className="text-xs text-[var(--text-secondary)] block mb-1">Date</label>
              <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-[var(--text-secondary)] block mb-1">Time</label>
              <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className="border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
            <button onClick={() => savePost("Draft")} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)]">Save Draft</button>
            <button onClick={() => savePost("Scheduled")} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Schedule</button>
            <button onClick={() => savePost("Published")} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Publish Now</button>
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {!loading && tab === "queue" && !showForm && (
        posts.length === 0 ? (
          <div className="text-center py-16 border border-[var(--border)] rounded-xl">
            <p className="text-sm text-[var(--text-secondary)] mb-2">No posts in queue</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)]">Create Post</button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(p => (
              <div key={p.key} className="border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-strong)] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] mb-2 line-clamp-2">{p.content || "No content"}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {p.platforms.map(pl => <span key={pl} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${PLAT_COLORS[pl] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]"}`}>{pl}</span>)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]"}`}>{p.status}</span>
                      {p.scheduledFor && <span>{new Date(p.scheduledFor).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {p.status === "Draft" && <button onClick={() => updatePostStatus(p, "Scheduled")} className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100">Schedule</button>}
                    {p.status !== "Published" && <button onClick={() => updatePostStatus(p, "Published")} className="px-2.5 py-1 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100">Publish</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Calendar Tab */}
      {!loading && tab === "calendar" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{monthNames[calMonth]} {calYear}</h3>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
          </div>
          <div className="grid grid-cols-7 border border-[var(--border)] rounded-xl overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="bg-[var(--bg-base)] px-2 py-2 text-center text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border)]">{d}</div>
            ))}
            {Array.from({ length: firstDow }, (_, i) => <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-[var(--border)]" />)}
            {calDays.map(day => {
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayPosts = postsByDate[dateStr] ?? [];
              const isToday = dateStr === new Date().toISOString().slice(0, 10);
              const isSelected = dateStr === selectedDate;
              return (
                <div key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[80px] border-b border-r border-[var(--border)] p-1 cursor-pointer hover:bg-[var(--bg-hover)] ${isSelected ? "bg-[var(--accent-subtle)]" : ""}`}>
                  <span className={`text-xs font-medium ${isToday ? "bg-[var(--accent)] text-[var(--primary-foreground)] rounded-full w-5 h-5 flex items-center justify-center" : "text-[var(--text-secondary)]"}`}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayPosts.slice(0, 2).map(p => (
                      <div key={p.key} className="rounded px-1 py-0.5 text-[9px] truncate text-white" style={{ backgroundColor: PLAT_CAL_COLORS[p.platforms[0]] ?? "#6b7280" }}>
                        {p.content.slice(0, 20)}
                      </div>
                    ))}
                    {dayPosts.length > 2 && <span className="text-[9px] text-[var(--text-tertiary)]">+{dayPosts.length - 2}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedDate && (
            <div className="mt-4 border border-[var(--border)] rounded-xl p-4">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Posts for {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h4>
              {(postsByDate[selectedDate] ?? []).length === 0
                ? <p className="text-xs text-[var(--text-tertiary)]">No posts scheduled for this day.</p>
                : (postsByDate[selectedDate] ?? []).map(p => (
                  <div key={p.key} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                    <div className="flex gap-1">{p.platforms.map(pl => <span key={pl} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PLAT_COLORS[pl]}`}>{pl}</span>)}</div>
                    <span className="text-sm text-[var(--text-secondary)] truncate flex-1">{p.content}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Accounts Tab */}
      {!loading && tab === "accounts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {socialProviders.map(sp => {
            const isConnected = connectedProviders.has(sp.key);
            return (
              <div key={sp.key} className={`border rounded-xl p-5 ${isConnected ? "border-green-200 bg-green-50" : "border-[var(--border)]"}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isConnected ? "bg-green-100 text-green-700" : "bg-[var(--bg-surface)] text-[var(--text-tertiary)]"}`}>
                    {sp.label[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{sp.label}</p>
                    <p className={`text-xs ${isConnected ? "text-green-600" : "text-[var(--text-tertiary)]"}`}>{isConnected ? "Connected" : "Not connected"}</p>
                  </div>
                </div>
                {!isConnected && (
                  <button onClick={() => openChatWithContext(`Help me connect my ${sp.label} account for social publishing.`)}
                    className="w-full px-3 py-2 text-xs font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">Connect</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Analytics Tab */}
      {!loading && tab === "analytics" && (
        <div>
          <div className="bg-[var(--accent-subtle)] border border-[var(--accent)] rounded-xl p-6 text-center mb-6">
            <p className="text-sm text-indigo-800 font-medium mb-1">Coming soon</p>
            <p className="text-xs text-[var(--accent)]">Connect your social accounts to see engagement metrics.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[{ label: "Impressions", value: "--", desc: "Total reach across platforms" },
              { label: "Clicks", value: "--", desc: "Link clicks from posts" },
              { label: "Engagement Rate", value: "--%", desc: "Average across all posts" }].map(m => (
              <div key={m.label} className="border border-[var(--border)] rounded-xl p-5">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{m.label}</p>
                <p className="text-2xl font-bold text-[var(--text-tertiary)]">{m.value}</p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
