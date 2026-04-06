"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { StudioNav } from "../StudioNav";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface VideoEntry {
  id: string;
  key: string;
  value: {
    title: string;
    description?: string;
    platform?: string;
    duration?: string;
    fileSize?: string;
    tags?: string[];
    status?: string;
    uploadDate?: string;
    createdBy?: string;
  };
  updatedAt: string;
  createdAt: string;
}

const PLATFORM_BADGE: Record<string, string> = {
  youtube: "bg-red-50 text-red-600",
  instagram: "bg-pink-50 text-pink-600",
  tiktok: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  linkedin: "bg-blue-50 text-blue-600",
  twitter: "bg-sky-50 text-sky-600",
};

const PLATFORMS = ["all", "youtube", "instagram", "tiktok", "linkedin", "twitter"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function VideoPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/content-studio/videos", { headers });
      if (res.ok) {
        const data = await res.json();
        setVideos(data.entries ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => platform === "all" ? videos : videos.filter((v) => v.value.platform === platform),
    [videos, platform]
  );

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <StudioNav />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Video Library</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage and organize your video content.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <button className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
            Upload Video
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
              <div className="h-40 bg-[var(--bg-surface)] rounded-lg mb-3" />
              <div className="h-4 w-32 bg-[var(--bg-surface)] rounded mb-2" />
              <div className="h-3 w-20 bg-[var(--bg-surface)] rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">&#x1F3AC;</div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No videos yet</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">Upload your first video to get started.</p>
          <button className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">
            Upload Video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((video) => (
            <div
              key={video.id}
              onClick={() => router.push(`/content-studio/video/${video.id}`)}
              className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            >
              {/* Thumbnail placeholder with play icon */}
              <div className="h-40 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-surface)] flex items-center justify-center relative">
                <div className="w-14 h-14 rounded-full bg-[var(--bg-base)]/80 flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-[var(--text-secondary)] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                {video.value.duration && (
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                    {video.value.duration}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{video.value.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {video.value.platform && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_BADGE[video.value.platform] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]"}`}>
                      {video.value.platform}
                    </span>
                  )}
                  {video.value.fileSize && (
                    <span className="text-xs text-[var(--text-tertiary)]">{video.value.fileSize}</span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">{fmtDate(video.value.uploadDate ?? video.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModuleLayoutShell>
  );
}
