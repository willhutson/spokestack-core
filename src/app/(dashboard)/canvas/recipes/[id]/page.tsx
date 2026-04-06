"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";

interface RecipeNode {
  type: string;
  label: string;
  positionX: number;
  positionY: number;
  config?: Record<string, unknown>;
}

interface RecipeDetail {
  id: string;
  name: string;
  category: string;
  description: string;
  nodeCount: number;
  setupTime: string;
  nodes: RecipeNode[];
  requiredConfig: string[];
}

const NODE_TYPE_COLORS: Record<string, string> = {
  START: "bg-emerald-100 text-emerald-700",
  END: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  ACTION: "bg-blue-100 text-blue-700",
  CONDITION: "bg-amber-100 text-amber-700",
  DELAY: "bg-purple-100 text-purple-700",
  APPROVAL: "bg-pink-100 text-pink-700",
  NOTIFICATION: "bg-cyan-100 text-cyan-700",
};

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);

  const loadRecipe = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/canvas/recipes/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRecipe(data.recipe ?? null);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

  async function handleInstall() {
    if (!recipe) return;
    setInstalling(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/canvas", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recipe.name,
          description: recipe.description,
          nodes: recipe.nodes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/canvas/${data.canvas.id}`);
      }
    } catch {
      /* ignore */
    } finally {
      setInstalling(false);
    }
  }

  if (loading) {
    return (
      <ModuleLayoutShell moduleType="WORKFLOWS">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--text-tertiary)]">Loading recipe...</p>
        </div>
      </ModuleLayoutShell>
    );
  }

  if (!recipe) {
    return (
      <ModuleLayoutShell moduleType="WORKFLOWS">
        <div className="p-6">
          <p className="text-sm text-[var(--text-secondary)]">Recipe not found.</p>
          <button
            onClick={() => router.push("/canvas/recipes")}
            className="mt-4 text-sm text-[var(--accent)] hover:text-[var(--accent)]"
          >
            &larr; Back to Recipes
          </button>
        </div>
      </ModuleLayoutShell>
    );
  }

  return (
    <ModuleLayoutShell moduleType="WORKFLOWS">
      <div className="p-6 max-w-3xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.push("/canvas/recipes")}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] mb-4 inline-block"
        >
          &larr; Back to Recipes
        </button>

        {/* Header */}
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{recipe.name}</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{recipe.description}</p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 bg-[var(--accent-subtle)] text-[var(--accent)] rounded-full">
              {recipe.category}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mb-4">
            <span>{recipe.nodeCount} nodes</span>
            <span>{recipe.setupTime} setup</span>
          </div>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {installing ? "Installing..." : "Install This Recipe"}
          </button>
        </div>

        {/* Workflow Steps */}
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Workflow Steps
          </h2>
          <div className="space-y-3">
            {recipe.nodes.map((node, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-[var(--bg-base)] rounded-lg"
              >
                <span className="text-xs font-bold text-[var(--text-tertiary)] w-6 text-center">
                  {idx + 1}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    NODE_TYPE_COLORS[node.type] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                  }`}
                >
                  {node.type}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">{node.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Required Configuration */}
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Required Configuration
          </h2>
          <ul className="space-y-2">
            {recipe.requiredConfig.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--accent)] mt-0.5 shrink-0">&bull;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
