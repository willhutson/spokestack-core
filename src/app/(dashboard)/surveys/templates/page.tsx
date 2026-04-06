"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { cn } from "@/lib/utils";
import { SurveysNav } from "../SurveysNav";

interface Template {
  id: string;
  name: string;
  category: string;
  questionCount: number;
  description: string;
}

const CATEGORIES = ["All", "NPS", "CSAT", "Onboarding", "Event", "Feedback"];

export default function SurveyTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/surveys/templates");
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
    NPS: "bg-purple-100 text-purple-700",
    CSAT: "bg-blue-100 text-blue-700",
    Onboarding: "bg-green-100 text-green-700",
    Event: "bg-amber-100 text-amber-700",
    Feedback: "bg-pink-100 text-pink-700",
  };

  return (
    <ModuleLayoutShell moduleType="SURVEYS">
      <div className="p-6 bg-[var(--bg-base)] min-h-full">
        <SurveysNav />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Survey Templates</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Start with a pre-built template and customize it.</p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-1 mb-6">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                activeCategory === cat ? "bg-[var(--accent)] text-[var(--primary-foreground)]" : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              )}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border border-[var(--border)] rounded-xl">
            <p className="text-sm text-[var(--text-secondary)]">No templates in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <div key={t.id} className="border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</h3>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", CATEGORY_COLORS[t.category] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]")}>
                    {t.category}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-3">{t.description}</p>
                <p className="text-xs text-[var(--text-tertiary)] mb-4">{t.questionCount} questions</p>
                <button className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">
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
