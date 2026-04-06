"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";

interface Recipe {
  id: string;
  name: string;
  category: string;
  description: string;
  nodeCount: number;
  setupTime: string;
}

const CATEGORIES = ["All", "Social", "Finance", "CRM", "General"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Social: "bg-pink-100 text-pink-700",
  Finance: "bg-amber-100 text-amber-700",
  CRM: "bg-blue-100 text-blue-700",
  General: "bg-gray-100 text-gray-700",
};

export default function RecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [installing, setInstalling] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/canvas/recipes", { headers });
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  async function handleInstall(recipe: Recipe) {
    setInstalling(recipe.id);
    try {
      const headers = await getAuthHeaders();

      // Fetch full recipe detail to get nodes
      const detailRes = await fetch(`/api/v1/canvas/recipes/${recipe.id}`, { headers });
      let nodes: { type: string; label: string; positionX: number; positionY: number; config?: Record<string, unknown> }[] = [];
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        nodes = detailData.recipe?.nodes ?? [];
      }

      const res = await fetch("/api/v1/canvas", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recipe.name,
          description: recipe.description,
          nodes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/canvas/${data.canvas.id}`);
      }
    } catch {
      /* ignore */
    } finally {
      setInstalling(null);
    }
  }

  const filtered =
    activeCategory === "All"
      ? recipes
      : recipes.filter((r) => r.category === activeCategory);

  return (
    <ModuleLayoutShell moduleType="WORKFLOWS">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push("/canvas")}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
            >
              &larr; Back to Canvases
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Workflow Recipes</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Pre-built workflow templates to get you started quickly
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeCategory === cat
                  ? "text-indigo-600 border-indigo-600"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Recipes Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Loading recipes...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-sm text-gray-500">No recipes in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {recipe.name}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      CATEGORY_COLORS[recipe.category] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {recipe.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">{recipe.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <span>{recipe.nodeCount} nodes</span>
                  <span>{recipe.setupTime} setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/canvas/recipes/${recipe.id}`)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleInstall(recipe)}
                    disabled={installing === recipe.id}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {installing === recipe.id ? "Installing..." : "Install"}
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
