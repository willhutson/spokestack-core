"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/client-auth";

interface ModulePricing {
  type: "free" | "paid" | "subscription";
  priceCents?: number;
  monthlyPriceCents?: number;
}

interface PublishedModule {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  category: string;
  status: string;
  version: string;
  installCount: number;
  avgRating: number;
  reviewCount: number;
  qualityScore: number;
  pricing: ModulePricing;
  createdAt: string;
  updatedAt: string;
}

interface BillingEvent {
  amountCents: number;
  publisherShareCents: number;
  type: string;
  createdAt: string;
}

interface ModuleAnalytics {
  moduleId: string;
  name: string;
  totalInstalls: number;
  activeInstalls: number;
  installsThisWeek: number;
  churnRate: number;
  avgRating: number;
  reviewCount: number;
  totalRevenueCents: number;
  totalRevenueFormatted: string;
  recentBillingEvents: BillingEvent[];
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-700",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-700",
  DEPRECATED: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
};

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "Published",
  PENDING_REVIEW: "Pending Review",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes Requested",
  DEPRECATED: "Deprecated",
};

const currencyFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

export default function MyModulesPage() {
  const [modules, setModules] = useState<PublishedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, ModuleAnalytics>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState<string | null>(null);

  useEffect(() => {
    loadModules();
  }, []);

  async function loadModules() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/marketplace/my-modules", { headers });
      if (!res.ok) throw new Error(`Failed to fetch modules: ${res.status}`);
      const data = await res.json();
      setModules(data.modules ?? []);
    } catch (err) {
      console.error("Failed to fetch published modules:", err);
      setError("Failed to load your modules. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics(moduleId: string) {
    if (analytics[moduleId]) return;
    setAnalyticsLoading(moduleId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/marketplace/analytics/${moduleId}`, { headers });
      if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`);
      const data: ModuleAnalytics = await res.json();
      setAnalytics((prev) => ({ ...prev, [moduleId]: data }));
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setAnalyticsLoading(null);
    }
  }

  function handleRowClick(moduleId: string) {
    if (expandedId === moduleId) {
      setExpandedId(null);
    } else {
      setExpandedId(moduleId);
      loadAnalytics(moduleId);
    }
  }

  function renderPricing(pricing: ModulePricing): string {
    if (pricing.type === "free") return "Free";
    if (pricing.type === "paid" && pricing.priceCents != null) {
      return formatCents(pricing.priceCents);
    }
    if (pricing.type === "subscription" && pricing.monthlyPriceCents != null) {
      return `${formatCents(pricing.monthlyPriceCents)}/mo`;
    }
    return pricing.type;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-56 bg-[var(--bg-surface)] rounded animate-pulse" />
          <div className="h-9 w-40 bg-[var(--bg-surface)] rounded-lg animate-pulse" />
        </div>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border)]">
              <div className="h-4 w-32 bg-[var(--bg-surface)] rounded animate-pulse" />
              <div className="h-4 w-20 bg-[var(--bg-surface)] rounded animate-pulse" />
              <div className="h-4 w-16 bg-[var(--bg-surface)] rounded animate-pulse" />
              <div className="h-4 w-12 bg-[var(--bg-surface)] rounded animate-pulse" />
              <div className="h-4 w-12 bg-[var(--bg-surface)] rounded animate-pulse" />
              <div className="h-4 w-16 bg-[var(--bg-surface)] rounded animate-pulse" />
              <div className="h-4 w-20 bg-[var(--bg-surface)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">My Published Modules</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage your published modules and view analytics
          </p>
        </div>
        <Link
          href="/marketplace/publish"
          className="inline-flex items-center gap-1.5 bg-[var(--accent)] text-[var(--primary-foreground)] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Publish New Module
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && modules.length === 0 && (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-[var(--accent-subtle)] rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            You haven&apos;t published any modules yet. Click &apos;Publish New Module&apos; to get started.
          </p>
        </div>
      )}

      {/* Modules table */}
      {modules.length > 0 && (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_0.7fr_0.8fr_0.8fr_0.7fr_1fr_0.8fr] gap-2 px-5 py-3 bg-[var(--bg-base)] border-b border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            <span>Name</span>
            <span>Status</span>
            <span>Version</span>
            <span>Installs</span>
            <span>Rating</span>
            <span>Quality</span>
            <span>Revenue</span>
            <span>Actions</span>
          </div>

          {/* Table rows */}
          {modules.map((mod) => (
            <div key={mod.id}>
              <div
                onClick={() => handleRowClick(mod.id)}
                className={`grid grid-cols-[2fr_1fr_0.7fr_0.8fr_0.8fr_0.7fr_1fr_0.8fr] gap-2 px-5 py-3.5 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--bg-base)] transition-colors items-center ${
                  expandedId === mod.id ? "bg-[var(--accent-subtle)]/50" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{mod.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{mod.shortDescription}</p>
                </div>
                <div>
                  <span
                    className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      STATUS_STYLES[mod.status] ?? "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {STATUS_LABELS[mod.status] ?? mod.status}
                  </span>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{mod.version}</span>
                <span className="text-sm text-[var(--text-secondary)]">{mod.installCount.toLocaleString()}</span>
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {mod.avgRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">({mod.reviewCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full"
                      style={{ width: `${Math.min(mod.qualityScore, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">{mod.qualityScore}</span>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{renderPricing(mod.pricing)}</span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/marketplace/${mod.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent)] font-medium"
                  >
                    View
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(mod.id);
                    }}
                    className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  >
                    {expandedId === mod.id ? "Hide" : "Stats"}
                  </button>
                </div>
              </div>

              {/* Expanded analytics panel */}
              {expandedId === mod.id && (
                <div className="px-5 py-4 bg-[var(--accent-subtle)]/30 border-b border-[var(--border)]">
                  {analyticsLoading === mod.id && !analytics[mod.id] ? (
                    <div className="flex items-center gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                          <div className="h-3 w-20 bg-[var(--bg-surface)] rounded animate-pulse mb-2" />
                          <div className="h-5 w-16 bg-[var(--bg-surface)] rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : analytics[mod.id] ? (
                    <div>
                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Total Installs</p>
                          <p className="text-lg font-semibold text-[var(--text-primary)]">
                            {analytics[mod.id].totalInstalls.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Active Installs</p>
                          <p className="text-lg font-semibold text-[var(--text-primary)]">
                            {analytics[mod.id].activeInstalls.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                          <p className="text-xs text-[var(--text-secondary)] mb-1">This Week</p>
                          <p className="text-lg font-semibold text-[var(--text-primary)]">
                            {analytics[mod.id].installsThisWeek.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Churn Rate</p>
                          <p className="text-lg font-semibold text-[var(--text-primary)]">
                            {(analytics[mod.id].churnRate * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-[var(--text-secondary)] mb-1">Total Revenue</p>
                            <p className="text-xl font-semibold text-[var(--text-primary)]">
                              {formatCents(analytics[mod.id].totalRevenueCents)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[var(--text-secondary)] mb-1">Rating</p>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {analytics[mod.id].avgRating.toFixed(1)}
                              </span>
                              <span className="text-xs text-[var(--text-tertiary)]">
                                ({analytics[mod.id].reviewCount} reviews)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recent billing events */}
                      {analytics[mod.id].recentBillingEvents.length > 0 && (
                        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-[var(--border)]">
                            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                              Recent Billing Events
                            </p>
                          </div>
                          <div className="divide-y divide-[var(--border)]">
                            {analytics[mod.id].recentBillingEvents.slice(0, 10).map((event, idx) => (
                              <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded">
                                    {event.type}
                                  </span>
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    {new Date(event.createdAt).toLocaleDateString("en-AE", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    Total: {formatCents(event.amountCents)}
                                  </span>
                                  <span className="text-sm font-medium text-[var(--accent)]">
                                    +{formatCents(event.publisherShareCents)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analytics[mod.id].recentBillingEvents.length === 0 && (
                        <p className="text-xs text-[var(--text-tertiary)] text-center py-3">
                          No billing events yet.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-tertiary)] text-center py-3">
                      Failed to load analytics.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
