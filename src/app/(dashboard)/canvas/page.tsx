"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";

interface CanvasSummary {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CanvasListPage() {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadCanvases = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/canvas", { headers });
      if (res.ok) {
        const data = await res.json();
        setCanvases(data.canvases ?? []);
      }
    } catch {
      /* API not available */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCanvases();
  }, [loadCanvases]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this canvas? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/v1/canvas/${id}`, {
        method: "DELETE",
        headers,
      });
      setCanvases((prev) => prev.filter((c) => c.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <ModuleLayoutShell moduleType="WORKFLOWS">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflow Canvas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Build and manage visual workflow automations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/canvas/recipes")}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Browse Recipes
            </button>
            <button
              onClick={() => router.push("/canvas/new")}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + New Canvas
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Canvases</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{canvases.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Nodes</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {canvases.reduce((sum, c) => sum + c.nodeCount, 0)}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Connections</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {canvases.reduce((sum, c) => sum + c.edgeCount, 0)}
            </p>
          </div>
        </div>

        {/* Canvas List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Loading canvases...</div>
          </div>
        ) : canvases.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">No canvases yet</h3>
            <p className="text-xs text-gray-500 mb-4">
              Create your first workflow canvas or start from a recipe.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/canvas/new")}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Create Canvas
              </button>
              <button
                onClick={() => router.push("/canvas/recipes")}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Browse Recipes
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/canvas/${canvas.id}`)}
                >
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                    {canvas.name}
                  </h3>
                  {canvas.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {canvas.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    <span>{canvas.nodeCount} node{canvas.nodeCount !== 1 ? "s" : ""}</span>
                    <span>{canvas.edgeCount} edge{canvas.edgeCount !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-xs text-gray-400">Updated {formatDate(canvas.updatedAt)}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/canvas/${canvas.id}`)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(canvas.id)}
                    disabled={deleting === canvas.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    {deleting === canvas.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
