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
interface Slide {
  title: string;
  body: string;
  notes: string;
}

interface DeckData {
  title: string;
  slides: Slide[];
  createdBy?: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DeckViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [deckTitle, setDeckTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/content-studio/decks", { headers });
      if (res.ok) {
        const data = await res.json();
        const entry = (data.entries ?? []).find((e: { id: string }) => e.id === id);
        if (entry) {
          const val = entry.value as DeckData;
          setDeck(val);
          setDeckTitle(val.title);
          if (currentSlide >= (val.slides?.length ?? 0)) setCurrentSlide(0);
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id, currentSlide]);

  useEffect(() => { load(); }, [load]);

  const slides = deck?.slides ?? [];
  const slide = slides[currentSlide] ?? null;

  function updateSlide(field: keyof Slide, value: string) {
    if (!deck) return;
    const updated = [...deck.slides];
    updated[currentSlide] = { ...updated[currentSlide], [field]: value };
    setDeck({ ...deck, slides: updated });
  }

  function addSlide() {
    if (!deck) return;
    const updated = [...deck.slides, { title: `Slide ${deck.slides.length + 1}`, body: "", notes: "" }];
    setDeck({ ...deck, slides: updated });
    setCurrentSlide(updated.length - 1);
  }

  function deleteSlide() {
    if (!deck || deck.slides.length <= 1) return;
    const updated = deck.slides.filter((_, i) => i !== currentSlide);
    setDeck({ ...deck, slides: updated });
    setCurrentSlide(Math.min(currentSlide, updated.length - 1));
  }

  async function save() {
    if (!deck) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/context", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "ENTITY",
          category: "deck",
          key: id,
          value: { ...deck, title: deckTitle },
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
          <div className="h-96 bg-[var(--bg-surface)] rounded-xl" />
        </div>
      </ModuleLayoutShell>
    );
  }

  if (!deck) {
    return (
      <ModuleLayoutShell moduleType="CONTENT_STUDIO">
        <StudioNav />
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Deck not found</h3>
          <Link href="/content-studio/decks" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">Back to Decks</Link>
        </div>
      </ModuleLayoutShell>
    );
  }

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <StudioNav />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/content-studio/decks" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)]">&larr; Back</Link>
          <input
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            className="text-xl font-bold text-[var(--text-primary)] bg-transparent border-b border-transparent hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none px-1"
          />
          <span className="text-xs text-[var(--text-tertiary)]">{slides.length} slide{slides.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
            Export
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left panel: slide thumbnails */}
        <div className="w-48 flex-shrink-0 space-y-2">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                i === currentSlide
                  ? "border-indigo-500 bg-[var(--accent-subtle)]"
                  : "border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--border-strong)]"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-tertiary)] w-5">{i + 1}</span>
                <span className="text-sm text-[var(--text-secondary)] truncate">{s.title || "Untitled"}</span>
              </div>
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              onClick={addSlide}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors"
            >
              + Add Slide
            </button>
            <button
              onClick={deleteSlide}
              disabled={slides.length <= 1}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-30 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Main area: current slide */}
        {slide && (
          <div className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8">
            <div className="mb-6">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Slide Title</label>
              <input
                value={slide.title}
                onChange={(e) => updateSlide("title", e.target.value)}
                className="w-full text-lg font-semibold text-[var(--text-primary)] bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] focus:outline-none pb-1"
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Body</label>
              <textarea
                value={slide.body}
                onChange={(e) => updateSlide("body", e.target.value)}
                rows={8}
                className="w-full text-sm text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y"
                placeholder="Slide content..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Speaker Notes</label>
              <textarea
                value={slide.notes}
                onChange={(e) => updateSlide("notes", e.target.value)}
                rows={3}
                className="w-full text-sm text-[var(--text-secondary)] bg-yellow-50 border border-yellow-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-y"
                placeholder="Notes for this slide..."
              />
            </div>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
