"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { ReplyNav } from "./ReplyNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContextEntry {
  id: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
}

type FilterTab = "all" | "mentions" | "dms" | "comments" | "flagged";
type Tone = "professional" | "casual" | "empathetic";

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Mentions", value: "mentions" },
  { label: "DMs", value: "dms" },
  { label: "Comments", value: "comments" },
  { label: "Flagged", value: "flagged" },
];

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "bg-sky-500",
  instagram: "bg-pink-500",
  facebook: "bg-blue-600",
  linkedin: "bg-blue-800",
  tiktok: "bg-[var(--bg-base)]",
};

const URGENCY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ReplyInboxPage() {
  const [items, setItems] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [tone, setTone] = useState<Tone>("professional");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const url =
        filter === "all"
          ? "/api/v1/reply/inbox"
          : `/api/v1/reply/inbox?type=${filter}`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setItems(data.entries ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unreadCount = items.filter(
    (i) => !(i.value.read as boolean)
  ).length;

  const filtered = items;

  function handleMarkDone(id: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, value: { ...i.value, done: true } } : i
      )
    );
  }

  function handleFlag(id: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, value: { ...i.value, flagged: !i.value.flagged } }
          : i
      )
    );
  }

  return (
    <ModuleLayoutShell moduleType="SOCIAL_PUBLISHING">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reply</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Unified social inbox and response management.
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-[var(--accent-subtle)] text-[var(--accent)]">
              {unreadCount} unread
            </span>
          )}
        </div>

        <ReplyNav />

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {FILTER_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === t.value
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Inbox List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 animate-pulse"
              >
                <div className="h-4 w-48 bg-[var(--bg-surface)] rounded mb-2" />
                <div className="h-3 w-72 bg-[var(--bg-surface)] rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-tertiary)] text-sm">
            No messages in inbox.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const platform = (item.value.platform as string) || "twitter";
              const urgency = (item.value.urgency as string) || "low";
              const sender = (item.value.sender as string) || "Unknown";
              const preview = (item.value.preview as string) || item.key;
              const isDone = item.value.done as boolean;
              const isFlagged = item.value.flagged as boolean;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "bg-[var(--bg-base)] border rounded-xl p-4 transition-all",
                    isDone
                      ? "border-[var(--border)] opacity-60"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Platform Badge */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                        PLATFORM_COLORS[platform] || "bg-[var(--bg-base)]0"
                      )}
                    >
                      {platform.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {sender}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            URGENCY_COLORS[urgency] || URGENCY_COLORS.low
                          )}
                        >
                          {urgency}
                        </span>
                        {isFlagged && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Flagged
                          </span>
                        )}
                        <span className="text-xs text-[var(--text-tertiary)] ml-auto">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] truncate">
                        {preview}
                      </p>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() =>
                            setReplyingTo(
                              replyingTo === item.id ? null : item.id
                            )
                          }
                          className="px-3 py-1 text-xs font-medium rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => handleMarkDone(item.id)}
                          className="px-3 py-1 text-xs font-medium rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                        >
                          {isDone ? "Done" : "Mark Done"}
                        </button>
                        <button
                          onClick={() => handleFlag(item.id)}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                            isFlagged
                              ? "bg-orange-100 text-orange-700"
                              : "bg-[var(--bg-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                          )}
                        >
                          {isFlagged ? "Unflag" : "Flag"}
                        </button>
                        <button className="px-3 py-1 text-xs font-medium rounded-lg bg-[var(--bg-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                          Assign
                        </button>
                      </div>

                      {/* Inline Reply */}
                      {replyingTo === item.id && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply..."
                            rows={3}
                            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--text-secondary)]">
                              Tone:
                            </span>
                            {(
                              [
                                "professional",
                                "casual",
                                "empathetic",
                              ] as Tone[]
                            ).map((t) => (
                              <button
                                key={t}
                                onClick={() => setTone(t)}
                                className={cn(
                                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                                  tone === t
                                    ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                                )}
                              >
                                {t}
                              </button>
                            ))}
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText("");
                              }}
                              className="ml-auto px-3 py-1 text-xs font-medium rounded-lg bg-[var(--accent)] text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)] transition-colors"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
