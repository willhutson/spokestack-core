"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { StudioNav } from "../StudioNav";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface DeckEntry {
  id: string;
  key: string;
  value: {
    title: string;
    slides: { title: string; body: string; notes: string }[];
    createdBy?: string;
  };
  updatedAt: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DecksPage() {
  const [decks, setDecks] = useState<DeckEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/content-studio/decks", { headers });
      if (res.ok) {
        const data = await res.json();
        setDecks(data.entries ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDuplicate(deck: DeckEntry) {
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/content-studio/decks", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${deck.value.title} (Copy)`,
          slides: deck.value.slides,
        }),
      });
      load();
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this deck?")) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/v1/context?id=${id}`, { method: "DELETE", headers });
      load();
    } catch { /* silent */ }
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <StudioNav />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Decks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage presentation decks.</p>
        </div>
        <Link
          href="/content-studio/decks/new"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          New Deck
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="h-32 bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">&#x1F4CA;</div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No decks yet</h3>
          <p className="text-xs text-gray-500 mb-4">Create your first presentation deck.</p>
          <Link
            href="/content-studio/decks/new"
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            New Deck
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <div key={deck.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
              {/* Thumbnail placeholder */}
              <div className="h-36 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                <span className="text-3xl text-indigo-300">&#x1F4CA;</span>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{deck.value.title}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span>{deck.value.slides?.length ?? 0} slide{(deck.value.slides?.length ?? 0) !== 1 ? "s" : ""}</span>
                  <span>Edited {fmtDate(deck.updatedAt)}</span>
                </div>
                {deck.value.createdBy && (
                  <p className="text-xs text-gray-400 mt-1 truncate">By {deck.value.createdBy}</p>
                )}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href={`/content-studio/decks/${deck.id}`}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => handleDuplicate(deck)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModuleLayoutShell>
  );
}
