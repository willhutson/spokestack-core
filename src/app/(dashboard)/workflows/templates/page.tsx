"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import WorkflowsNav from "../WorkflowsNav";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  stepCount: number;
  installCount: number;
}

type CategoryFilter = "All" | "Social" | "Finance" | "CRM" | "Reporting" | "General";

const CATEGORIES: CategoryFilter[] = ["All", "Social", "Finance", "CRM", "Reporting", "General"];

const CATEGORY_COLORS: Record<string, string> = {
  Social: "bg-blue-100 text-blue-700",
  Finance: "bg-emerald-100 text-emerald-700",
  CRM: "bg-purple-100 text-purple-700",
  Reporting: "bg-yellow-100 text-yellow-700",
  General: "bg-gray-100 text-gray-700",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function WorkflowTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>("All");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/workflows/templates", { headers });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered =
    category === "All"
      ? templates
      : templates.filter((t) => t.category === category);

  function handleInstall(template: Template) {
    console.log("Install template:", template.id, template.name);
  }

  return (
    <ModuleLayoutShell moduleType="WORKFLOWS">
      <div className="p-6 h-full flex flex-col bg-white">
        <WorkflowsNav />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Workflow Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pre-built workflows to get you started quickly
          </p>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                category === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No templates found</h2>
            <p className="text-sm text-gray-500">
              No templates match the selected category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template) => (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      CATEGORY_COLORS[template.category] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {template.category}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      </svg>
                      {template.stepCount} steps
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {template.installCount} installs
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleInstall(template)}
                  className="w-full px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Install
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
