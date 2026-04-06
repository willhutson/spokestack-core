"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";

interface ModulePricing {
  type: "free" | "paid" | "subscription";
  priceCents?: number;
  monthlyPriceCents?: number;
}

interface BrowseModule {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  category: string;
  industry: string;
  installCount: number;
  avgRating: number;
  reviewCount: number;
  pricing: ModulePricing;
  qualityScore: number;
  version: string;
  publisherOrgId: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "sales", label: "Sales" },
  { key: "marketing", label: "Marketing" },
  { key: "operations", label: "Operations" },
  { key: "hr", label: "HR" },
  { key: "finance", label: "Finance" },
  { key: "intelligence", label: "Intelligence" },
  { key: "automation", label: "Automation" },
  { key: "research", label: "Research" },
  { key: "advertising", label: "Advertising" },
  { key: "productivity", label: "Productivity" },
];

const SORT_TABS = [
  { key: "popular", label: "Popular" },
  { key: "newest", label: "Newest" },
  { key: "top_rated", label: "Top Rated" },
];

const currencyFmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

function formatPrice(pricing: ModulePricing): string {
  if (pricing.type === "free") return "Free";
  if (pricing.type === "subscription" && pricing.monthlyPriceCents != null) {
    return `${currencyFmt.format(pricing.monthlyPriceCents / 100)}/mo`;
  }
  if (pricing.type === "paid" && pricing.priceCents != null) {
    return currencyFmt.format(pricing.priceCents / 100);
  }
  return "Free";
}

function pricingBadgeClasses(type: string): string {
  if (type === "free") return "bg-green-50 text-green-700";
  if (type === "subscription") return "bg-[var(--accent-subtle)] text-[var(--accent)]";
  return "bg-amber-50 text-amber-700";
}

function renderStars(rating: number) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <svg
        key={i}
        className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "text-yellow-400" : "text-gray-200"}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  }
  return stars;
}

export default function BrowseModulesPage() {
  const router = useRouter();
  const [modules, setModules] = useState<BrowseModule[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      params.set("sort", sort);
      if (search) params.set("q", search);
      params.set("page", String(page));

      const res = await fetch(`/api/v1/marketplace/browse?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch modules: ${res.status}`);
      const data = await res.json();
      setModules(data.modules ?? []);
      setPagination(data.pagination ?? null);
    } catch (err) {
      console.error("Browse fetch error:", err);
      setError("Failed to load modules. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [category, sort, search, page]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleCategoryChange(key: string) {
    setCategory(key);
    setPage(1);
  }

  function handleSortChange(key: string) {
    setSort(key);
    setPage(1);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Browse Modules</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Discover and install published modules from the community
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search modules..."
            className="border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-[var(--accent)] text-[var(--primary-foreground)] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              category === cat.key
                ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {SORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleSortChange(tab.key)}
            className={`text-sm font-medium px-4 py-2 border-b-2 transition-colors ${
              sort === tab.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-[var(--bg-surface)] rounded w-2/3 mb-3" />
              <div className="h-3 bg-[var(--bg-surface)] rounded w-full mb-2" />
              <div className="h-3 bg-[var(--bg-surface)] rounded w-4/5 mb-4" />
              <div className="flex gap-2 mb-3">
                <div className="h-5 bg-[var(--bg-surface)] rounded-full w-16" />
                <div className="h-5 bg-[var(--bg-surface)] rounded-full w-12" />
              </div>
              <div className="h-3 bg-[var(--bg-surface)] rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Module grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <div
              key={m.id}
              onClick={() => router.push(`/marketplace/${m.slug}`)}
              className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md hover:border-[var(--accent)] transition-all cursor-pointer flex flex-col h-full min-h-[180px]"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight truncate">{m.name}</h3>
                <span className="text-[10px] text-[var(--text-tertiary)] font-mono shrink-0">v{m.version}</span>
              </div>

              {/* Description — clamped */}
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-3">{m.shortDescription}</p>

              {/* Tags — fixed row, no wrap overflow */}
              <div className="flex items-center gap-1.5 mb-auto">
                <span className="text-[10px] font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full capitalize shrink-0">
                  {m.category}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${pricingBadgeClasses(m.pricing.type)}`}>
                  {formatPrice(m.pricing)}
                </span>
              </div>

              {/* Footer — pinned bottom */}
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-1">
                  <div className="flex">{renderStars(m.avgRating)}</div>
                  <span>({m.reviewCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{m.installCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && modules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-tertiary)]">No modules match your search.</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
