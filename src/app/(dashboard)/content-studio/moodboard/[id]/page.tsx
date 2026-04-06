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
interface ImageItem {
  url: string;
  caption: string;
}

interface BoardData {
  name: string;
  images: ImageItem[];
  tags: string[];
  createdBy?: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function MoodboardEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [newTag, setNewTag] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/content-studio/moodboards", { headers });
      if (res.ok) {
        const data = await res.json();
        const entry = (data.entries ?? []).find((e: { id: string }) => e.id === id);
        if (entry) {
          setBoard(entry.value as BoardData);
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function addImage() {
    if (!board || !imageUrl.trim()) return;
    setBoard({ ...board, images: [...board.images, { url: imageUrl.trim(), caption: "" }] });
    setImageUrl("");
    setShowUrlInput(false);
  }

  function removeImage(index: number) {
    if (!board) return;
    setBoard({ ...board, images: board.images.filter((_, i) => i !== index) });
  }

  function updateCaption(index: number, caption: string) {
    if (!board) return;
    const updated = [...board.images];
    updated[index] = { ...updated[index], caption };
    setBoard({ ...board, images: updated });
  }

  function addTag() {
    if (!board || !newTag.trim()) return;
    if (board.tags.includes(newTag.trim())) { setNewTag(""); return; }
    setBoard({ ...board, tags: [...board.tags, newTag.trim()] });
    setNewTag("");
  }

  function removeTag(tag: string) {
    if (!board) return;
    setBoard({ ...board, tags: board.tags.filter((t) => t !== tag) });
  }

  async function save() {
    if (!board) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/context", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "ENTITY",
          category: "moodboard",
          key: id,
          value: board,
        }),
      });
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <ModuleLayoutShell moduleType="CONTENT_STUDIO">
        <StudioNav />
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[var(--bg-surface)] rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-[var(--bg-surface)] rounded-lg" />
            ))}
          </div>
        </div>
      </ModuleLayoutShell>
    );
  }

  if (!board) {
    return (
      <ModuleLayoutShell moduleType="CONTENT_STUDIO">
        <StudioNav />
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Moodboard not found</h3>
          <Link href="/content-studio/moodboard" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">Back to Moodboards</Link>
        </div>
      </ModuleLayoutShell>
    );
  }

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <StudioNav />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/content-studio/moodboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)]">&larr; Back</Link>
          <input
            value={board.name}
            onChange={(e) => setBoard({ ...board, name: e.target.value })}
            className="text-xl font-bold text-[var(--text-primary)] bg-transparent border-b border-transparent hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none px-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUrlInput(true)}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            Add Image
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Add image URL input */}
      {showUrlInput && (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 mb-6 flex items-center gap-3">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Paste image URL..."
            className="flex-1 h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            onKeyDown={(e) => e.key === "Enter" && addImage()}
          />
          <button onClick={addImage} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">Add</button>
          <button onClick={() => { setShowUrlInput(false); setImageUrl(""); }} className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)]">Cancel</button>
        </div>
      )}

      {/* Image grid */}
      {board.images.length === 0 ? (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center mb-6">
          <div className="text-4xl mb-3">&#x1F5BC;</div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No images yet</h3>
          <p className="text-xs text-[var(--text-secondary)]">Add images by URL to build your moodboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {board.images.map((img, i) => (
            <div key={i} className="group relative bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="aspect-square bg-[var(--bg-surface)] flex items-center justify-center relative">
                {img.url ? (
                  <img src={img.url} alt={img.caption || ""} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[var(--text-tertiary)] text-sm">No image</span>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => removeImage(i)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="p-2">
                <input
                  value={img.caption}
                  onChange={(e) => updateCaption(i, e.target.value)}
                  placeholder="Add caption..."
                  className="w-full text-xs text-[var(--text-secondary)] bg-transparent border-b border-transparent hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Tags</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {board.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-full text-xs">
              {tag}
              <button onClick={() => removeTag(tag)} className="text-[var(--text-tertiary)] hover:text-red-500 ml-0.5">&times;</button>
            </span>
          ))}
          {board.tags.length === 0 && <span className="text-xs text-[var(--text-tertiary)]">No tags yet</span>}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            className="h-8 px-3 text-xs border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            onKeyDown={(e) => e.key === "Enter" && addTag()}
          />
          <button onClick={addTag} className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">Add</button>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
