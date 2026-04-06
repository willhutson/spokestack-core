"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { MarketingNav } from "../MarketingNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  key: string;
  value: {
    name: string;
    status: string;
    platforms: string[];
    budget: number;
    spent: number;
    startDate: string;
    endDate: string;
    objectives: string;
    roi: number;
  };
  createdAt: string;
}

const STATUSES = ["PLANNING", "ACTIVE", "COMPLETED"];
const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Twitter", "Facebook"];

const statusColors: Record<string, string> = {
  PLANNING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    platforms: [] as string[],
    budget: "",
    startDate: "",
    endDate: "",
    objectives: "",
  });

  async function loadCampaigns() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/context?category=campaign", { headers });
      const data = await res.json();
      setCampaigns(data.entries || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCampaigns(); }, []);

  async function handleSubmit() {
    if (!form.name) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/context", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "ENTITY",
          category: "campaign",
          key: form.name,
          value: {
            name: form.name,
            status: "PLANNING",
            platforms: form.platforms,
            budget: Number(form.budget) || 0,
            spent: 0,
            startDate: form.startDate,
            endDate: form.endDate,
            objectives: form.objectives,
            roi: 0,
          },
        }),
      });
      setForm({ name: "", platforms: [], budget: "", startDate: "", endDate: "", objectives: "" });
      setShowForm(false);
      loadCampaigns();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const togglePlatform = (p: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  const filtered = filterStatus
    ? campaigns.filter((c) => c.value?.status === filterStatus)
    : campaigns;

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <div className="p-6">
        <MarketingNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Campaigns</h1>
            <p className="text-sm text-[var(--text-secondary)]">Plan, launch, and track marketing campaigns.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[var(--accent)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)]"
          >
            {showForm ? "Cancel" : "New Campaign"}
          </button>
        </div>

        {showForm && (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">New Campaign</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Campaign Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Budget (AED)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" />
              <input placeholder="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="mt-3">
              <p className="text-xs text-[var(--text-secondary)] mb-2">Platforms</p>
              <div className="flex gap-2 flex-wrap">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                      form.platforms.includes(p) ? "bg-[var(--accent-subtle)] text-[var(--accent)] border-indigo-300" : "bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-strong)]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <textarea
                placeholder="Objectives"
                value={form.objectives}
                onChange={(e) => setForm({ ...form, objectives: e.target.value })}
                rows={3}
                className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={handleSubmit} disabled={saving || !form.name} className="px-4 py-2 bg-[var(--accent)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50">
                {saving ? "Saving..." : "Create Campaign"}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button onClick={() => setFilterStatus("")} className={cn("px-3 py-1.5 rounded-lg text-sm", !filterStatus ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]")}>All</button>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={cn("px-3 py-1.5 rounded-lg text-sm", filterStatus === s ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]")}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No campaigns found. Create your first campaign.</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-base)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Platforms</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Budget (AED)</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Spent (AED)</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Dates</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">ROI %</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const v = c.value;
                  const utilization = v.budget > 0 ? Math.round((v.spent / v.budget) * 100) : 0;
                  return (
                    <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">{v.name}</p>
                        <div className="mt-1 w-32 bg-[var(--bg-surface)] rounded-full h-1.5">
                          <div className="bg-[var(--accent)] h-1.5 rounded-full" style={{ width: `${Math.min(utilization, 100)}%` }} />
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{utilization}% budget used</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColors[v.status] || "bg-[var(--bg-surface)] text-[var(--text-secondary)]")}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(v.platforms || []).map((p: string) => (
                            <span key={p} className="text-xs text-[var(--text-secondary)]">{p}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-primary)]">{(v.budget || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[var(--text-primary)]">{(v.spent || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {v.startDate || "TBD"} - {v.endDate || "TBD"}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-primary)]">{v.roi || 0}%</td>
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
