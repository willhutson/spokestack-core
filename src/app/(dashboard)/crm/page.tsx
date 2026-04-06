"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { CrmNav } from "./CrmNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContextEntry {
  id: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
}

interface Stats {
  totalContacts: number;
  openDeals: number;
  pipelineValue: number;
  totalCompanies: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
  }).format(amount);
}

/* ------------------------------------------------------------------ */
/*  Quick Link Card                                                    */
/* ------------------------------------------------------------------ */
function QuickLink({
  href,
  title,
  description,
  color,
}: {
  href: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold",
            color
          )}
        >
          {title.charAt(0)}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {title}
        </h3>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function CRMOverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    openDeals: 0,
    pipelineValue: 0,
    totalCompanies: 0,
  });
  const [recentContacts, setRecentContacts] = useState<ContextEntry[]>([]);
  const [recentDeals, setRecentDeals] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [contactsRes, dealsRes, companiesRes] = await Promise.all([
        fetch("/api/v1/crm/contacts", { headers }),
        fetch("/api/v1/crm/deals", { headers }),
        fetch("/api/v1/crm/companies", { headers }),
      ]);

      let contacts: ContextEntry[] = [];
      let deals: ContextEntry[] = [];
      let companies: ContextEntry[] = [];

      if (contactsRes.ok) {
        contacts = (await contactsRes.json()).entries ?? [];
      }
      if (dealsRes.ok) {
        deals = (await dealsRes.json()).entries ?? [];
      }
      if (companiesRes.ok) {
        companies = (await companiesRes.json()).entries ?? [];
      }

      const openDeals = deals.filter(
        (d) =>
          d.value.stage !== "CLOSED_WON" && d.value.stage !== "CLOSED_LOST"
      );
      const pipelineValue = openDeals.reduce(
        (sum, d) => sum + (Number(d.value.value) || 0),
        0
      );

      setStats({
        totalContacts: contacts.length,
        openDeals: openDeals.length,
        pipelineValue,
        totalCompanies: companies.length,
      });

      setRecentContacts(contacts.slice(0, 5));
      setRecentDeals(deals.slice(0, 5));
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <ModuleLayoutShell moduleType="CRM">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage contacts, deals, companies, and tasks.
          </p>
        </div>

        <CrmNav />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"
              >
                <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                <div className="h-7 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Contacts"
                value={String(stats.totalContacts)}
              />
              <StatCard
                label="Open Deals"
                value={String(stats.openDeals)}
              />
              <StatCard
                label="Pipeline Value"
                value={fmtCurrency(stats.pipelineValue)}
              />
              <StatCard
                label="Companies"
                value={String(stats.totalCompanies)}
              />
            </div>

            {/* Quick Links */}
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Quick Access
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <QuickLink
                href="/crm/contacts"
                title="Contacts"
                description="Manage leads, prospects, and customers."
                color="bg-blue-600"
              />
              <QuickLink
                href="/crm/deals"
                title="Deals"
                description="Track your pipeline and deal stages."
                color="bg-emerald-600"
              />
              <QuickLink
                href="/crm/companies"
                title="Companies"
                description="View and manage company profiles."
                color="bg-purple-600"
              />
              <QuickLink
                href="/crm/tasks"
                title="Tasks"
                description="CRM-related tasks and follow-ups."
                color="bg-amber-600"
              />
            </div>

            {/* Recent Activity Rows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Contacts */}
              <div className="bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Recent Contacts
                  </h3>
                  <Link
                    href="/crm/contacts"
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    View all
                  </Link>
                </div>
                {recentContacts.length === 0 ? (
                  <div className="px-5 py-8 text-center text-xs text-gray-400">
                    No contacts yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recentContacts.map((c) => (
                      <div
                        key={c.id}
                        className="px-5 py-3 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                          {c.key.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {c.key}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {(c.value.email as string) ||
                              (c.value.company as string) ||
                              "No details"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            c.value.type === "lead"
                              ? "bg-amber-50 text-amber-600"
                              : c.value.type === "prospect"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-emerald-50 text-emerald-600"
                          )}
                        >
                          {(c.value.type as string) || "customer"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Deals */}
              <div className="bg-white border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Recent Deals
                  </h3>
                  <Link
                    href="/crm/deals"
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    View all
                  </Link>
                </div>
                {recentDeals.length === 0 ? (
                  <div className="px-5 py-8 text-center text-xs text-gray-400">
                    No deals yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recentDeals.map((d) => (
                      <div
                        key={d.id}
                        className="px-5 py-3 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {d.key}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {(d.value.company as string) || "No company"}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {fmtCurrency(Number(d.value.value) || 0)}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {(d.value.stage as string) || "LEAD"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
