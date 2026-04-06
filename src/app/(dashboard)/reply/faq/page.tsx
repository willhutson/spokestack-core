"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { ReplyNav } from "../ReplyNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContextEntry {
  id: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
}

const FAQ_CATEGORIES = ["Product", "Pricing", "Support", "General"];

const CATEGORY_COLORS: Record<string, string> = {
  Product: "bg-blue-100 text-blue-700",
  Pricing: "bg-emerald-100 text-emerald-700",
  Support: "bg-amber-100 text-amber-700",
  General: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function FaqPage() {
  const [faqs, setFaqs] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState("General");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/reply/faq", { headers });
      if (res.ok) {
        const data = await res.json();
        setFaqs(data.entries ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate() {
    if (!question.trim() || !answer.trim()) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/reply/faq", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, faqCategory }),
      });
      if (res.ok) {
        setQuestion("");
        setAnswer("");
        setFaqCategory("General");
        setShowForm(false);
        loadData();
      }
    } catch {
      /* silent */
    }
  }

  const filtered = faqs.filter(
    (f) =>
      !search ||
      f.key.toLowerCase().includes(search.toLowerCase()) ||
      ((f.value.answer as string) || "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <ModuleLayoutShell moduleType="SOCIAL_PUBLISHING">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reply</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            FAQ library for quick, approved responses.
          </p>
        </div>

        <ReplyNav />

        {/* Actions */}
        <div className="flex items-center gap-4 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FAQs..."
            className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)] transition-colors shrink-0"
          >
            {showForm ? "Cancel" : "New FAQ"}
          </button>
        </div>

        {/* New FAQ Form */}
        {showForm && (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 mb-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Question
              </label>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is your return policy?"
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Approved Answer
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write the approved response..."
                rows={3}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <select
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {FAQ_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreate}
                disabled={!question.trim() || !answer.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
              >
                Save FAQ
              </button>
            </div>
          </div>
        )}

        {/* FAQ List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 animate-pulse"
              >
                <div className="h-4 w-48 bg-[var(--bg-surface)] rounded mb-2" />
                <div className="h-3 w-72 bg-[var(--bg-surface)] rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-tertiary)] text-sm">
            {search ? "No FAQs match your search." : "No FAQs added yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((faq) => {
              const cat = (faq.value.category as string) || "General";
              return (
                <div
                  key={faq.id}
                  className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-strong)] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          {faq.key}
                        </h3>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            CATEGORY_COLORS[cat] || CATEGORY_COLORS.General
                          )}
                        >
                          {cat}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                        {(faq.value.answer as string) || ""}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] shrink-0">
                      Used {(faq.value.usageCount as number) ?? 0}x
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
