"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { StudioNav } from "../StudioNav";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface MoodboardEntry {
  id: string;
  key: string;
  value: {
    name: string;
    images: { url: string; caption?: string }[];
    tags: string[];
    createdBy?: string;
  };
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function MoodboardPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<MoodboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/content-studio/moodboards", { headers });
      if (res.ok) {
        const data = await res.json();
        setBoards(data.entries ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createBoard() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/content-studio/moodboards", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Moodboard" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/content-studio/moodboard/${data.entry.id}`);
      }
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
          <h1 className="text-2xl font-bold text-gray-900">Moodboards</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visual inspiration and reference boards.</p>
        </div>
        <button
          onClick={createBoard}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          New Moodboard
        </button>
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
      ) : boards.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">&#x1F3A8;</div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No moodboards yet</h3>
          <p className="text-xs text-gray-500 mb-4">Create a moodboard to collect visual inspiration.</p>
          <button
            onClick={createBoard}
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            New Moodboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <div
              key={board.id}
              onClick={() => router.push(`/content-studio/moodboard/${board.id}`)}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors cursor-pointer"
            >
              {/* Image grid preview */}
              <div className="grid grid-cols-3 gap-0.5 bg-gray-100 h-32">
                {(board.value.images ?? []).slice(0, 6).map((img, i) => (
                  <div key={i} className="bg-gray-200 flex items-center justify-center overflow-hidden">
                    {img.url ? (
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">IMG</span>
                    )}
                  </div>
                ))}
                {(board.value.images ?? []).length < 6 &&
                  Array.from({ length: 6 - Math.min((board.value.images ?? []).length, 6) }).map((_, i) => (
                    <div key={`ph-${i}`} className="bg-gray-100" />
                  ))}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900">{board.value.name}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span>{(board.value.images ?? []).length} image{(board.value.images ?? []).length !== 1 ? "s" : ""}</span>
                  <span>Edited {fmtDate(board.updatedAt)}</span>
                </div>
                {board.value.tags && board.value.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {board.value.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModuleLayoutShell>
  );
}
