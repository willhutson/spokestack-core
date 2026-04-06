"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { StudioNav } from "../../StudioNav";
import { useState, useEffect, useCallback, use } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface VideoData {
  title: string;
  description: string;
  platform: string | null;
  duration: string | null;
  fileSize: string | null;
  tags: string[];
  status: string;
  uploadDate: string;
  createdBy?: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  processing: "bg-yellow-100 text-yellow-700",
  ready: "bg-blue-100 text-blue-700",
  published: "bg-emerald-100 text-emerald-700",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/content-studio/videos", { headers });
      if (res.ok) {
        const data = await res.json();
        const entry = (data.entries ?? []).find((e: { id: string }) => e.id === id);
        if (entry) {
          setVideo(entry.value as VideoData);
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function addTag() {
    if (!video || !newTag.trim()) return;
    if (video.tags.includes(newTag.trim())) { setNewTag(""); return; }
    setVideo({ ...video, tags: [...video.tags, newTag.trim()] });
    setNewTag("");
  }

  function removeTag(tag: string) {
    if (!video) return;
    setVideo({ ...video, tags: video.tags.filter((t) => t !== tag) });
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  if (loading) {
    return (
      <ModuleLayoutShell moduleType="CONTENT_STUDIO">
        <StudioNav />
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[var(--bg-surface)] rounded" />
          <div className="h-80 bg-[var(--bg-surface)] rounded-xl" />
        </div>
      </ModuleLayoutShell>
    );
  }

  if (!video) {
    return (
      <ModuleLayoutShell moduleType="CONTENT_STUDIO">
        <StudioNav />
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Video not found</h3>
          <Link href="/content-studio/video" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">Back to Videos</Link>
        </div>
      </ModuleLayoutShell>
    );
  }

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <StudioNav />

      <div className="flex items-center gap-3 mb-6">
        <Link href="/content-studio/video" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)]">&larr; Back</Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{video.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video player placeholder */}
        <div className="lg:col-span-2">
          <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-[var(--bg-base)]/20 flex items-center justify-center cursor-pointer hover:bg-[var(--bg-base)]/30 transition-colors">
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Description</h3>
            <p className="text-sm text-[var(--text-secondary)]">{video.description || "No description provided."}</p>
          </div>
        </div>

        {/* Metadata panel */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Status</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[video.status] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]")}>
                  {video.status}
                </span>
              </div>
              {video.duration && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Duration</span>
                  <span className="text-sm text-[var(--text-primary)]">{video.duration}</span>
                </div>
              )}
              {video.fileSize && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">File Size</span>
                  <span className="text-sm text-[var(--text-primary)]">{video.fileSize}</span>
                </div>
              )}
              {video.platform && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Platform</span>
                  <span className="text-sm text-[var(--text-primary)] capitalize">{video.platform}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">Upload Date</span>
                <span className="text-sm text-[var(--text-primary)]">{fmtDate(video.uploadDate)}</span>
              </div>
              {video.createdBy && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Uploaded By</span>
                  <span className="text-sm text-[var(--text-primary)] truncate max-w-[150px]">{video.createdBy}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {video.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-full text-xs">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-[var(--text-tertiary)] hover:text-red-500 ml-0.5">&times;</button>
                </span>
              ))}
              {video.tags.length === 0 && <span className="text-xs text-[var(--text-tertiary)]">No tags</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="h-8 px-3 text-xs border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] flex-1"
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
              <button onClick={addTag} className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">Add</button>
            </div>
          </div>

          {/* Publish action */}
          <Link
            href="/social-publishing"
            className="block w-full px-4 py-3 text-sm font-medium text-center text-[var(--primary-foreground)] bg-[var(--accent)] rounded-xl hover:bg-[var(--accent-hover)] transition-colors"
          >
            Publish to Social
          </Link>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
