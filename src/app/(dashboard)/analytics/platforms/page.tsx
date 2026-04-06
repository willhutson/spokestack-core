"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { cn } from "@/lib/utils";
import { AnalyticsNav } from "../AnalyticsNav";

interface PlatformData {
  platform: string;
  followers: number;
  posts: number;
  engagementRate: number;
  totalReach: number;
}

interface ContextEntry {
  id: string;
  key: string;
  value: string;
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string; bgColor: string; abbr: string }> = {
  instagram: { label: "Instagram", color: "text-pink-600", bgColor: "bg-pink-100", abbr: "IG" },
  tiktok: { label: "TikTok", color: "text-gray-900", bgColor: "bg-gray-100", abbr: "TT" },
  linkedin: { label: "LinkedIn", color: "text-blue-700", bgColor: "bg-blue-100", abbr: "LI" },
  twitter: { label: "Twitter/X", color: "text-gray-800", bgColor: "bg-gray-100", abbr: "X" },
  facebook: { label: "Facebook", color: "text-blue-600", bgColor: "bg-blue-100", abbr: "FB" },
};

const PLATFORMS_ORDER = ["instagram", "tiktok", "linkedin", "twitter", "facebook"];
const PERIODS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/context?category=platform_analytics", { headers });
      if (res.ok) {
        const d = await res.json();
        const parsed: PlatformData[] = (d.entries ?? []).map((e: ContextEntry) => {
          try {
            const v = JSON.parse(e.value);
            return {
              platform: v.platform ?? e.key,
              followers: v.followers ?? 0,
              posts: v.posts ?? 0,
              engagementRate: v.engagementRate ?? 0,
              totalReach: v.totalReach ?? 0,
            };
          } catch {
            return { platform: e.key, followers: 0, posts: 0, engagementRate: 0, totalReach: 0 };
          }
        });
        setPlatforms(parsed);
      }
    } catch {
      // API unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Merge fetched data with default platform list
  const platformCards = PLATFORMS_ORDER.map((key) => {
    const data = platforms.find((p) => p.platform.toLowerCase() === key);
    const config = PLATFORM_CONFIG[key];
    return {
      key,
      label: config.label,
      color: config.color,
      bgColor: config.bgColor,
      abbr: config.abbr,
      followers: data?.followers ?? 0,
      posts: data?.posts ?? 0,
      engagementRate: data?.engagementRate ?? 0,
      totalReach: data?.totalReach ?? 0,
    };
  });

  return (
    <ModuleLayoutShell moduleType="ANALYTICS">
      <div className="p-6 bg-white min-h-full">
        <AnalyticsNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Comparison</h1>
            <p className="text-sm text-gray-500 mt-0.5">Compare performance across social platforms.</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  period === p.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformCards.map((p) => (
              <div key={p.key} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                {/* Platform Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", p.bgColor)}>
                    <span className={cn("text-sm font-bold", p.color)}>{p.abbr}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{p.label}</h3>
                    <p className="text-[10px] text-gray-400">Last {period} days</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 mb-0.5">Followers</p>
                    <p className="text-lg font-bold text-gray-900">{p.followers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 mb-0.5">Posts</p>
                    <p className="text-lg font-bold text-gray-900">{p.posts}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 mb-0.5">Engagement Rate</p>
                    <p className="text-lg font-bold text-emerald-600">{p.engagementRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 mb-0.5">Total Reach</p>
                    <p className="text-lg font-bold text-gray-900">{p.totalReach.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
