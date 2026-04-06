"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import DemoSandbox from "@/components/marketplace/DemoSandbox";
import { MODULE_DEMOS } from "@/lib/marketplace/demo-data";

/* ── types ──────────────────────────────────────────────────────── */

interface ToolDef {
  name: string;
  method: string;
  path: string;
  description: string;
  parameters?: { name: string; type?: string; required?: boolean; description?: string }[];
}

interface Pricing {
  type: string;
  priceCents?: number;
  monthlyPriceCents?: number;
}

interface PublishedModule {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: string;
  industry?: string;
  moduleType: string;
  tools: ToolDef[];
  systemPrompt?: string;
  pricing: Pricing;
  status: string;
  version: string;
  installCount: number;
  avgRating: number;
  reviewCount: number;
  qualityScore?: number;
  publisherOrgId: string;
  isInstalled: boolean;
  installedVersion?: string;
}

interface LegacyModule {
  moduleType: string;
  name: string;
  description: string;
  category: string;
  minTier: string;
  price: number | null;
  agentName: string;
}

interface Review {
  id: string;
  rating: number;
  text: string;
  isVerifiedInstall: boolean;
  createdAt: string;
  reviewerOrgId: string;
}

/* ── helpers ────────────────────────────────────────────────────── */

const aed = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" });

function Stars({ rating, size = "text-base" }: { rating: number; size?: string }) {
  return (
    <span className={`${size} text-amber-400`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= Math.round(rating) ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

/* ── component ──────────────────────────────────────────────────── */

export default function MarketplaceModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.moduleId as string;

  const [published, setPublished] = useState<PublishedModule | null>(null);
  const [legacy, setLegacy] = useState<LegacyModule | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "tools" | "reviews">("overview");

  // reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const moduleType = published?.moduleType ?? rawId.toUpperCase();
  const demo = MODULE_DEMOS[moduleType] ?? null;

  /* ── data fetch ─────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const headers = await getAuthHeaders();

      // 1. Try published marketplace endpoint
      try {
        const res = await fetch(`/api/v1/marketplace/${rawId}`, { headers });
        if (res.ok) {
          const data: PublishedModule = await res.json();
          if (!cancelled) {
            setPublished(data);
            setIsInstalled(data.isInstalled);
            setIsLoading(false);
            fetchReviews(headers);
            return;
          }
        }
      } catch {
        /* fall through */
      }

      // 2. Fallback: legacy internal module registry
      try {
        const [allRes, installedRes] = await Promise.all([
          fetch("/api/v1/modules").then((r) => r.json()),
          fetch("/api/v1/modules/installed", { headers }).then((r) => r.json()),
        ]);
        if (!cancelled) {
          const upperKey = rawId.toUpperCase();
          const allModules: LegacyModule[] = allRes.modules ?? [];
          const found = allModules.find((m) => m.moduleType === upperKey) ?? null;
          setLegacy(found);
          const installed: { moduleType: string; active: boolean }[] = installedRes.installed ?? [];
          setIsInstalled(installed.some((m) => m.moduleType === upperKey && m.active));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawId]);

  async function fetchReviews(headers: Record<string, string>) {
    try {
      const res = await fetch(`/api/v1/marketplace/${rawId}/reviews`, { headers });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
      }
    } catch {
      /* ignore */
    }
  }

  /* ── actions ────────────────────────────────────────────────── */

  async function handleInstall() {
    setIsInstalling(true);
    try {
      const headers = { ...(await getAuthHeaders()), "Content-Type": "application/json" };
      if (published) {
        const res = await fetch("/api/v1/marketplace/install", {
          method: "POST",
          headers,
          body: JSON.stringify({ moduleId: published.id, acceptPricing: true }),
        });
        if (res.ok) setIsInstalled(true);
      } else {
        const res = await fetch("/api/v1/modules/install", {
          method: "POST",
          headers,
          body: JSON.stringify({ moduleType: rawId.toUpperCase() }),
        });
        if (res.ok) setIsInstalled(true);
      }
    } finally {
      setIsInstalling(false);
    }
  }

  async function handleUninstall() {
    setIsInstalling(true);
    try {
      const headers = { ...(await getAuthHeaders()), "Content-Type": "application/json" };
      const res = await fetch("/api/v1/marketplace/uninstall", {
        method: "POST",
        headers,
        body: JSON.stringify({ moduleId: published!.id }),
      });
      if (res.ok) setIsInstalled(false);
    } finally {
      setIsInstalling(false);
    }
  }

  async function handleSubmitReview() {
    setSubmittingReview(true);
    try {
      const headers = { ...(await getAuthHeaders()), "Content-Type": "application/json" };
      const res = await fetch(`/api/v1/marketplace/${rawId}/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify({ rating: reviewRating, text: reviewText }),
      });
      if (res.ok) {
        setReviewText("");
        setReviewRating(5);
        fetchReviews(await getAuthHeaders());
      }
    } finally {
      setSubmittingReview(false);
    }
  }

  /* ── derived ────────────────────────────────────────────────── */

  const name = published?.name ?? legacy?.name ?? demo?.label ?? rawId;
  const description = published?.description ?? legacy?.description ?? demo?.description ?? "";
  const category = published?.category ?? legacy?.category;
  const version = published?.version;
  const industry = published?.industry;

  /* ── loading ────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[var(--bg-surface)] rounded w-48" />
          <div className="h-4 bg-[var(--bg-surface)] rounded w-96" />
          <div className="h-64 bg-[var(--bg-surface)] rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── pricing helper ─────────────────────────────────────────── */

  function PricingBadge() {
    if (!published) {
      if (legacy?.price) return <span className="text-xs text-[var(--text-secondary)]">{aed.format(legacy.price / 100)}/mo</span>;
      return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>;
    }
    const p = published.pricing;
    if (p.type === "free" || (!p.priceCents && !p.monthlyPriceCents)) {
      return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>;
    }
    const amount = p.monthlyPriceCents ?? p.priceCents ?? 0;
    return <span className="text-xs text-[var(--text-secondary)]">{aed.format(amount / 100)}{p.monthlyPriceCents ? "/mo" : ""}</span>;
  }

  /* ── rating distribution ────────────────────────────────────── */

  function RatingDistribution() {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    const max = Math.max(...counts, 1);
    return (
      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((star) => (
          <div key={star} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="w-4 text-right">{star}</span>
            <span className="text-amber-400">★</span>
            <div className="flex-1 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(counts[star - 1] / max) * 100}%` }} />
            </div>
            <span className="w-6 text-right">{counts[star - 1]}</span>
          </div>
        ))}
      </div>
    );
  }

  /* ── tabs ────────────────────────────────────────────────────── */

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "tools", label: "Tools" },
    { key: "reviews", label: "Reviews" },
  ];

  /* ── render ─────────────────────────────────────────────────── */

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/marketplace")}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Marketplace
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{name}</h1>
            {version && (
              <span className="text-xs font-medium text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-full">v{version}</span>
            )}
            {category && (
              <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-full">{category}</span>
            )}
            {industry && (
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{industry}</span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{published?.shortDescription ?? description}</p>
        </div>

        {/* Install / Uninstall */}
        <div className="shrink-0 ml-4">
          {isInstalled ? (
            published ? (
              <button
                onClick={handleUninstall}
                disabled={isInstalling}
                className="rounded-lg border border-red-200 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isInstalling ? "Removing..." : "Uninstall"}
              </button>
            ) : (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">Installed</span>
            )
          ) : (
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="rounded-lg bg-[var(--accent)] text-[var(--primary-foreground)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {isInstalling ? "Installing..." : "Install"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Description</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{description}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Pricing</p>
              <PricingBadge />
            </div>
            {published && (
              <>
                <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 text-center">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Installs</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{published.installCount.toLocaleString()}</p>
                </div>
                <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 text-center">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Rating</p>
                  <div className="flex items-center justify-center gap-1">
                    <Stars rating={published.avgRating} size="text-sm" />
                    <span className="text-xs text-[var(--text-secondary)]">({published.reviewCount})</span>
                  </div>
                </div>
                <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 text-center">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Publisher</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{published.publisherOrgId}</p>
                </div>
              </>
            )}
            {legacy && !published && (
              <>
                <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 text-center">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Min Tier</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{legacy.minTier}</p>
                </div>
                <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 text-center">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Agent</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{legacy.agentName}</p>
                </div>
              </>
            )}
          </div>

          {/* Demo sandbox */}
          {demo && (
            <DemoSandbox
              demo={demo}
              isInstalled={isInstalled}
              onInstall={!isInstalled ? handleInstall : undefined}
            />
          )}
        </div>
      )}

      {/* ── Tools tab ────────────────────────────────────────── */}
      {activeTab === "tools" && (
        <div className="space-y-4">
          {published?.tools && published.tools.length > 0 ? (
            published.tools.map((tool) => (
              <div key={tool.name} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{tool.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-subtle)] px-1.5 py-0.5 rounded">
                    {tool.method}
                  </span>
                  <code className="text-xs text-[var(--text-tertiary)]">{tool.path}</code>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-3">{tool.description}</p>
                {tool.parameters && tool.parameters.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Parameters</p>
                    {tool.parameters.map((p) => (
                      <div key={p.name} className="flex items-baseline gap-2 text-xs">
                        <code className="text-[var(--accent)] font-medium">{p.name}</code>
                        {p.type && <span className="text-[var(--text-tertiary)]">{p.type}</span>}
                        {p.required && <span className="text-red-400">required</span>}
                        {p.description && <span className="text-[var(--text-secondary)]">— {p.description}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-tertiary)]">
              No tool definitions available for this module.
            </div>
          )}
        </div>
      )}

      {/* ── Reviews tab ──────────────────────────────────────── */}
      {activeTab === "reviews" && (
        <div className="space-y-6">
          {/* Rating distribution */}
          {reviews.length > 0 && (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Rating Distribution</h3>
              <RatingDistribution />
            </div>
          )}

          {/* Submit review form (only for published + installed + not own module) */}
          {published && isInstalled && (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Write a Review</h3>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setReviewRating(n)}
                    className={`text-2xl transition-colors ${n <= reviewRating ? "text-amber-400" : "text-[var(--text-tertiary)]"} hover:text-amber-400`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience (optional)"
                rows={3}
                className="w-full border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
              />
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="mt-3 rounded-lg bg-[var(--accent)] text-[var(--primary-foreground)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          )}

          {/* Review cards */}
          {reviews.length > 0 ? (
            reviews.map((r) => (
              <div key={r.id} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Stars rating={r.rating} size="text-sm" />
                  {r.isVerifiedInstall && (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      Verified Install
                    </span>
                  )}
                </div>
                {r.text && <p className="text-sm text-[var(--text-secondary)] mt-2">{r.text}</p>}
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  {new Date(r.createdAt).toLocaleDateString()} &middot; {r.reviewerOrgId}
                </p>
              </div>
            ))
          ) : (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-tertiary)]">
              No reviews yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
