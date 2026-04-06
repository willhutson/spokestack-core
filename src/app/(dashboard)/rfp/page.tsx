"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { RfpNav } from "./RfpNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Brief {
  id: string;
  title: string;
  description: string | null;
  clientName: string | null;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
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

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={cn("text-2xl font-bold", color || "text-gray-900")}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function RfpOverviewPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", { headers });
      if (res.ok) {
        const data = await res.json();
        const allBriefs: Brief[] = data.briefs ?? [];
        const rfps = allBriefs.filter(
          (b) =>
            (b.metadata?.type as string)?.toUpperCase() === "RFP" ||
            b.title?.toLowerCase().includes("rfp")
        );
        setBriefs(rfps);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const active = briefs.filter(
    (b) => b.status !== "WON" && b.status !== "LOST"
  );
  const won = briefs.filter((b) => b.status === "WON");
  const lost = briefs.filter((b) => b.status === "LOST");
  const submitted = briefs.filter((b) => b.status === "SUBMITTED");
  const winRate =
    won.length + lost.length > 0
      ? Math.round((won.length / (won.length + lost.length)) * 100)
      : 0;
  const recent = briefs.slice(0, 5);

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RFP</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Request for Proposal tracking and management.
            </p>
          </div>
          <Link
            href="/briefs/new/rfp"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            New RFP
          </Link>
        </div>

        <RfpNav />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"
              >
                <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                <div className="h-7 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatCard label="Active RFPs" value={String(active.length)} />
              <StatCard
                label="Submitted"
                value={String(submitted.length)}
              />
              <StatCard
                label="Won"
                value={String(won.length)}
                color="text-emerald-600"
              />
              <StatCard
                label="Lost"
                value={String(lost.length)}
                color="text-red-600"
              />
              <StatCard
                label="Win Rate"
                value={`${winRate}%`}
                color={
                  winRate >= 50 ? "text-emerald-600" : "text-amber-600"
                }
              />
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <Link
                href="/rfp/active"
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  Active RFPs
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  View and manage currently active proposals.
                </p>
              </Link>
              <Link
                href="/rfp/closed"
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  Closed RFPs
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Review won and lost proposals.
                </p>
              </Link>
            </div>

            {/* Recent RFPs */}
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Recent RFPs
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {recent.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-gray-400">
                  No RFPs yet. Create one to get started.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recent.map((rfp) => {
                    const client =
                      rfp.clientName ||
                      (rfp.metadata?.client as string) ||
                      "No client";
                    const value = Number(rfp.metadata?.value) || 0;
                    return (
                      <div
                        key={rfp.id}
                        className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {rfp.title}
                          </p>
                          <p className="text-xs text-gray-500">{client}</p>
                        </div>
                        {value > 0 && (
                          <p className="text-sm font-semibold text-gray-900">
                            {fmtCurrency(value)}
                          </p>
                        )}
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            rfp.status === "WON"
                              ? "bg-emerald-50 text-emerald-600"
                              : rfp.status === "LOST"
                              ? "bg-red-50 text-red-600"
                              : rfp.status === "SUBMITTED"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {rfp.status || "DRAFT"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
