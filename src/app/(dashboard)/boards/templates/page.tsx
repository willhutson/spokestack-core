"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { cn } from "@/lib/utils";
import { BoardsNav } from "../BoardsNav";

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  columns: string[];
}

const CATEGORIES = ["All", "Engineering", "Marketing", "General"];

export default function BoardTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/boards/templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = activeCategory === "All" ? templates : templates.filter((t) => t.category === activeCategory);

  const CATEGORY_COLORS: Record<string, string> = {
    Engineering: "bg-blue-100 text-blue-700",
    Marketing: "bg-purple-100 text-purple-700",
    General: "bg-gray-100 text-gray-600",
  };

  return (
    <ModuleLayoutShell moduleType="BOARDS">
      <div className="p-6 bg-white min-h-full">
        <BoardsNav />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Board Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Start with a pre-built board layout.</p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-1 mb-6">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                activeCategory === cat ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-500">No templates in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <div key={t.id} className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">{t.name}</h3>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", CATEGORY_COLORS[t.category] ?? "bg-gray-100 text-gray-600")}>
                    {t.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{t.description}</p>

                {/* Column Preview */}
                <div className="mb-4">
                  <p className="text-[10px] font-medium text-gray-400 mb-1.5">Columns</p>
                  <div className="flex flex-wrap gap-1">
                    {t.columns.map((col, i) => (
                      <span key={i} className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  Use Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
