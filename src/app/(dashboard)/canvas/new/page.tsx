"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";

export default function NewCanvasPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreateBlank(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/canvas", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        setFormError(body.error || "Failed to create canvas");
        return;
      }
      const data = await res.json();
      router.push(`/canvas/${data.canvas.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModuleLayoutShell moduleType="WORKFLOWS">
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/canvas")}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] mb-2 inline-block"
          >
            &larr; Back to Canvases
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">New Workflow Canvas</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Start from scratch or use a pre-built recipe
          </p>
        </div>

        {/* Two Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Blank Canvas */}
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
            <div className="w-10 h-10 bg-[var(--accent-subtle)] rounded-lg flex items-center justify-center mb-4">
              <span className="text-[var(--accent)] font-bold text-lg">+</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Blank Canvas</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Start with an empty canvas and build your workflow from scratch.
            </p>
            <form onSubmit={handleCreateBlank} className="space-y-3">
              <input
                type="text"
                placeholder="Canvas name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Creating..." : "Create Blank Canvas"}
              </button>
            </form>
          </div>

          {/* From Recipe */}
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 flex flex-col">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-emerald-600 font-bold text-lg">&#9776;</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">From Recipe</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4 flex-1">
              Choose from pre-built workflow templates to get started quickly.
            </p>
            <button
              onClick={() => router.push("/canvas/recipes")}
              className="w-full px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Browse Recipes
            </button>
          </div>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
