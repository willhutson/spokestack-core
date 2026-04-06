"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { PublisherNav } from "../PublisherNav";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface PublishedPost {
  id: string;
  key: string;
  content: string;
  platforms: string[];
  publishedAt: string;
  impressions: number;
  likes: number;
  comments: number;
  engagementRate: number;
  updatedAt: string;
}

const PLAT_COLORS: Record<string, string> = {
  Facebook: "bg-blue-100 text-blue-700",
  LinkedIn: "bg-sky-100 text-sky-700",
  Instagram: "bg-pink-100 text-pink-700",
  X: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  TikTok: "bg-purple-100 text-purple-700",
};

type SortMode = "recent" | "engagement";

export default function PublishedPage() {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortMode>("recent");

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const sort = sortBy === "engagement" ? "engagement" : "recent";
      const res = await fetch(`/api/v1/social-publishing/posts?status=Published&sort=${sort}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setPosts(d.posts ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => { load(); }, [load]);

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <ModuleLayoutShell moduleType="SOCIAL_PUBLISHING">
      <div className="p-6 bg-[var(--bg-base)] min-h-full">
        <PublisherNav />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Published</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">History of published posts and their performance.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
              className="border border-[var(--border-strong)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="recent">Most Recent</option>
              <option value="engagement">Best Engagement</option>
            </select>
          </div>
        </div>

        {loading && <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">Loading...</div>}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16 border border-[var(--border)] rounded-xl">
            <svg className="mx-auto w-10 h-10 text-[var(--text-tertiary)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-sm text-[var(--text-secondary)] mb-1">No published posts yet</p>
            <p className="text-xs text-[var(--text-tertiary)]">Posts will appear here once they are published.</p>
          </div>
        )}

        {/* Table */}
        {!loading && posts.length > 0 && (
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-base)] border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Platform</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Post</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Published</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Impressions</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Likes</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Comments</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {posts.map((p) => (
                  <tr key={p.key} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.platforms.map((pl) => (
                          <span key={pl} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", PLAT_COLORS[pl] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]")}>
                            {pl}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-[var(--text-primary)] truncate">
                        {p.content.length > 80 ? `${p.content.slice(0, 80)}...` : p.content || "No content"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {p.publishedAt
                        ? new Date(p.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)] font-medium tabular-nums">
                      {formatNumber(p.impressions)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)] font-medium tabular-nums">
                      {formatNumber(p.likes)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)] font-medium tabular-nums">
                      {formatNumber(p.comments)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          p.engagementRate >= 5
                            ? "bg-green-100 text-green-700"
                            : p.engagementRate >= 2
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                        )}
                      >
                        {p.engagementRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
