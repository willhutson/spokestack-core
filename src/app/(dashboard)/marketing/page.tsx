"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { MarketingNav } from "./MarketingNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface ContextEntry {
  id: string;
  key: string;
  category: string;
  value: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function MarketingOverviewPage() {
  const [recentActivity, setRecentActivity] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    contentPieces: 0,
    creators: 0,
    engagementRate: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();

        const [creatorsRes, contextRes] = await Promise.all([
          fetch("/api/v1/marketing/creators", { headers }),
          fetch("/api/v1/context?category=campaign", { headers }),
        ]);

        const creatorsData = await creatorsRes.json();
        const contextData = await contextRes.json();

        const creators = creatorsData.entries || [];
        const campaigns = contextData.entries || [];

        const activeCampaigns = campaigns.filter(
          (c: ContextEntry) => (c.value as Record<string, unknown>).status === "ACTIVE"
        ).length;

        const totalEngagement = creators.reduce(
          (sum: number, c: ContextEntry) =>
            sum + (Number((c.value as Record<string, unknown>).engagementRate) || 0),
          0
        );

        setStats({
          activeCampaigns,
          contentPieces: campaigns.length,
          creators: creators.length,
          engagementRate: creators.length > 0 ? totalEngagement / creators.length : 0,
        });

        const allEntries = [...creators, ...campaigns]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 10);

        setRecentActivity(allEntries);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const summaryCards = [
    { label: "Active Campaigns", value: stats.activeCampaigns, color: "text-green-600" },
    { label: "Content Pieces", value: stats.contentPieces, color: "text-blue-600" },
    { label: "Creators", value: stats.creators, color: "text-purple-600" },
    { label: "Engagement Rate", value: `${stats.engagementRate.toFixed(1)}%`, color: "text-orange-600" },
  ];

  const quickLinks = [
    { label: "Manage Creators", href: "/marketing/creators", description: "Add and manage creator/influencer partnerships" },
    { label: "Campaigns", href: "/marketing/campaigns", description: "Plan, launch, and track marketing campaigns" },
    { label: "Content Builder", href: "/marketing/builder", description: "Create social posts, emails, and ad creatives" },
  ];

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <div className="p-6">
        <MarketingNav />
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Marketing Overview</h1>
          <p className="text-sm text-[var(--text-secondary)]">Your marketing command center.</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-sm text-[var(--text-secondary)]">{card.label}</p>
              <p className={cn("text-2xl font-bold mt-1", card.color)}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {quickLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <h3 className="text-sm font-medium text-[var(--text-primary)]">{link.label}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{link.description}</p>
            </a>
          ))}
        </div>

        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-medium text-[var(--text-primary)] mb-4">Recent Activity</h2>
          {loading ? (
            <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">Loading...</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">
              No recent activity. Start by adding creators or creating campaigns.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{entry.key}</p>
                    <p className="text-xs text-[var(--text-secondary)] capitalize">{entry.category}</p>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {new Date(entry.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
