"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { cn } from "@/lib/utils";
import { AnalyticsNav } from "../AnalyticsNav";

interface Campaign {
  id: string;
  name: string;
  platforms: string[];
  status: string;
  reach: number;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

interface ContextEntry {
  id: string;
  key: string;
  value: string;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Paused: "bg-yellow-100 text-yellow-700",
  Completed: "bg-gray-100 text-gray-600",
  Draft: "bg-blue-100 text-blue-700",
};

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "IG",
  TikTok: "TT",
  LinkedIn: "LI",
  "Twitter/X": "X",
  Facebook: "FB",
};

const STATUSES = ["All", "Active", "Paused", "Completed", "Draft"];

type SortKey = "name" | "reach" | "impressions" | "clicks" | "ctr" | "spend" | "conversions";

const aed = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 });

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/context?category=campaign", { headers });
      if (res.ok) {
        const d = await res.json();
        const parsed: Campaign[] = (d.entries ?? []).map((e: ContextEntry) => {
          try {
            const v = JSON.parse(e.value);
            return {
              id: e.key,
              name: v.name ?? e.key,
              platforms: v.platforms ?? [],
              status: v.status ?? "Draft",
              reach: v.reach ?? 0,
              impressions: v.impressions ?? 0,
              clicks: v.clicks ?? 0,
              spend: v.spend ?? 0,
              conversions: v.conversions ?? 0,
            };
          } catch {
            return { id: e.key, name: e.key, platforms: [], status: "Draft", reach: 0, impressions: 0, clicks: 0, spend: 0, conversions: 0 };
          }
        });
        setCampaigns(parsed);
      }
    } catch {
      // API unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = statusFilter === "All" ? campaigns : campaigns.filter((c) => c.status === statusFilter);
    list = [...list].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortKey === "ctr") {
        aVal = a.impressions > 0 ? a.clicks / a.impressions : 0;
        bVal = b.impressions > 0 ? b.clicks / b.impressions : 0;
      } else if (sortKey === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [campaigns, statusFilter, sortKey, sortDir]);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 cursor-pointer hover:text-gray-700 select-none"
      onClick={() => toggleSort(k)}>
      <span className="flex items-center gap-1">
        {label}
        {sortKey === k && (
          <svg className={cn("w-3 h-3", sortDir === "desc" && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        )}
      </span>
    </th>
  );

  return (
    <ModuleLayoutShell moduleType="ANALYTICS">
      <div className="p-6 bg-white min-h-full">
        <AnalyticsNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Performance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track and compare campaign metrics across platforms.</p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">No campaigns found</p>
            <p className="text-xs text-gray-400">Campaign data will appear once campaigns are tracked.</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <SortHeader label="Campaign" k="name" />
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Platforms</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  <SortHeader label="Reach" k="reach" />
                  <SortHeader label="Impressions" k="impressions" />
                  <SortHeader label="Clicks" k="clicks" />
                  <SortHeader label="CTR %" k="ctr" />
                  <SortHeader label="Spend (AED)" k="spend" />
                  <SortHeader label="Conversions" k="conversions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {c.platforms.map((p) => (
                            <span key={p} className="px-1.5 py-0.5 text-[9px] font-semibold bg-gray-100 text-gray-600 rounded">
                              {PLATFORM_ICONS[p] ?? p.slice(0, 2).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600")}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.reach.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ctr}%</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{aed.format(c.spend)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.conversions.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
