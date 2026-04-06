"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { CrmNav } from "../CrmNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface CompanyEntry {
  id: string;
  key: string;
  value: {
    name: string;
    industry?: string;
    website?: string;
    notes?: string;
  };
  createdAt: string;
}

const INDUSTRY_COLORS: Record<string, string> = {
  technology: "bg-blue-50 text-blue-700 border-blue-200",
  finance: "bg-emerald-50 text-emerald-700 border-emerald-200",
  healthcare: "bg-red-50 text-red-700 border-red-200",
  retail: "bg-amber-50 text-amber-700 border-amber-200",
  manufacturing: "bg-purple-50 text-purple-700 border-purple-200",
  education: "bg-indigo-50 text-indigo-700 border-indigo-200",
  real_estate: "bg-teal-50 text-teal-700 border-teal-200",
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function getIndustryColor(industry?: string): string {
  if (!industry) return "bg-gray-100 text-gray-600 border-gray-200";
  return (
    INDUSTRY_COLORS[industry.toLowerCase()] ||
    "bg-gray-100 text-gray-600 border-gray-200"
  );
}

/* ------------------------------------------------------------------ */
/*  Add Company Form                                                   */
/* ------------------------------------------------------------------ */
function AddCompanyForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Company name is required.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/crm/companies", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry: industry.trim() || undefined,
          website: website.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErr(data?.error || `Failed: ${res.statusText}`);
        return;
      }
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">New Company</h2>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Industry
            </label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Technology"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Website
            </label>
            <Input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add Company"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(
        `/api/v1/crm/companies?${params.toString()}`,
        { headers }
      );
      if (res.ok) {
        setCompanies((await res.json()).entries ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  return (
    <ModuleLayoutShell moduleType="CRM">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View and manage company profiles.
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>New Company</Button>
          )}
        </div>

        <CrmNav />

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {showForm && (
          <AddCompanyForm
            onCreated={() => {
              setShowForm(false);
              loadCompanies();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                </div>
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No companies found
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {search
                ? "Try adjusting your search."
                : "Add your first company to get started."}
            </p>
            {!search && (
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Add Company
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700">
                    {getInitials(c.key)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {c.key}
                    </h3>
                    {c.value.website && (
                      <a
                        href={c.value.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-700 truncate block"
                      >
                        {c.value.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
                {c.value.industry && (
                  <Badge
                    variant="outline"
                    className={cn(getIndustryColor(c.value.industry))}
                  >
                    {c.value.industry}
                  </Badge>
                )}
                {c.value.notes && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {c.value.notes}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-3">
                  Added{" "}
                  {new Date(c.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
