"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { MarketingNav } from "../MarketingNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface Creator {
  id: string;
  key: string;
  value: {
    name: string;
    handle: string;
    platform: string;
    followers: number;
    rate: number;
    email: string;
    engagementRate: number;
  };
  createdAt: string;
}

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "LinkedIn"];

const platformColors: Record<string, string> = {
  Instagram: "bg-pink-100 text-pink-700",
  TikTok: "bg-gray-100 text-gray-700",
  YouTube: "bg-red-100 text-red-700",
  LinkedIn: "bg-blue-100 text-blue-700",
};

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", handle: "", platform: "Instagram", followers: "", rate: "", email: "",
  });
  const [saving, setSaving] = useState(false);

  async function loadCreators() {
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterPlatform) params.set("platform", filterPlatform);
      const res = await fetch(`/api/v1/marketing/creators?${params}`, { headers });
      const data = await res.json();
      setCreators(data.entries || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCreators(); }, [search, filterPlatform]);

  async function handleSubmit() {
    if (!form.name) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/marketing/creators", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          handle: form.handle,
          platform: form.platform,
          followers: Number(form.followers) || 0,
          rate: Number(form.rate) || 0,
          email: form.email,
          engagementRate: 0,
        }),
      });
      setForm({ name: "", handle: "", platform: "Instagram", followers: "", rate: "", email: "" });
      setShowForm(false);
      loadCreators();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const formatFollowers = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <div className="p-6">
        <MarketingNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Creators</h1>
            <p className="text-sm text-gray-500">Manage creator and influencer partnerships.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            {showForm ? "Cancel" : "Add Creator"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">New Creator</h3>
            <div className="grid grid-cols-3 gap-3">
              <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Handle (@)" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input placeholder="Followers" type="number" value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Rate (AED)" type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={handleSubmit} disabled={saving || !form.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save Creator"}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
          />
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Platforms</option>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        ) : creators.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500">No creators yet. Add your first creator above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {creators.map((creator) => {
              const v = creator.value;
              const isExpanded = expandedId === creator.id;
              return (
                <div
                  key={creator.id}
                  onClick={() => setExpandedId(isExpanded ? null : creator.id)}
                  className={cn(
                    "bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 transition-all",
                    isExpanded && "col-span-3 border-indigo-300"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {v.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{v.name}</h3>
                      <p className="text-xs text-gray-500">{v.handle || "No handle"}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", platformColors[v.platform] || "bg-gray-100 text-gray-600")}>
                          {v.platform}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>{formatFollowers(v.followers || 0)} followers</span>
                        <span>{v.engagementRate || 0}% engagement</span>
                        <span>{v.rate || 0} AED</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Email</p>
                          <p className="text-gray-900">{v.email || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Platform</p>
                          <p className="text-gray-900">{v.platform}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Handle</p>
                          <p className="text-gray-900">{v.handle || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Added</p>
                          <p className="text-gray-900">{new Date(creator.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Collaboration History</h4>
                        <p className="text-xs text-gray-400">No collaborations recorded yet.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
