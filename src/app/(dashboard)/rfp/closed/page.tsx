"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { RfpNav } from "../RfpNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

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

type ClosedFilter = "all" | "won" | "lost";

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
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ClosedRfpPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ClosedFilter>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", { headers });
      if (res.ok) {
        const data = await res.json();
        const allBriefs: Brief[] = data.briefs ?? [];
        const closed = allBriefs.filter((b) => {
          const isRfp =
            (b.metadata?.type as string)?.toUpperCase() === "RFP" ||
            b.title?.toLowerCase().includes("rfp");
          const isClosed = b.status === "WON" || b.status === "LOST";
          return isRfp && isClosed;
        });
        setBriefs(closed);
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

  const filtered =
    filter === "all"
      ? briefs
      : briefs.filter((b) => b.status === filter.toUpperCase());

  const won = briefs.filter((b) => b.status === "WON");
  const lost = briefs.filter((b) => b.status === "LOST");
  const totalWonValue = won.reduce(
    (sum, b) => sum + (Number(b.metadata?.value) || 0),
    0
  );
  const totalLostValue = lost.reduce(
    (sum, b) => sum + (Number(b.metadata?.value) || 0),
    0
  );

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">RFP</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review closed proposals and outcomes.
          </p>
        </div>

        <RfpNav />

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Total Won Value
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              {fmtCurrency(totalWonValue)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {won.length} proposal{won.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Total Lost Value
            </p>
            <p className="text-2xl font-bold text-red-600">
              {fmtCurrency(totalLostValue)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {lost.length} proposal{lost.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Net Difference
            </p>
            <p
              className={cn(
                "text-2xl font-bold",
                totalWonValue >= totalLostValue
                  ? "text-emerald-600"
                  : "text-red-600"
              )}
            >
              {fmtCurrency(totalWonValue - totalLostValue)}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "won", "lost"] as ClosedFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                filter === f
                  ? f === "won"
                    ? "bg-emerald-100 text-emerald-700"
                    : f === "lost"
                    ? "bg-red-100 text-red-700"
                    : "bg-indigo-100 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              )}
            >
              {f} ({f === "all" ? briefs.length : f === "won" ? won.length : lost.length})
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
              >
                <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-64 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">
            No closed RFPs found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((rfp) => {
              const client =
                rfp.clientName ||
                (rfp.metadata?.client as string) ||
                "No client";
              const value = Number(rfp.metadata?.value) || 0;
              const reason = (rfp.metadata?.lossReason as string) || "";
              const isWon = rfp.status === "WON";

              return (
                <div
                  key={rfp.id}
                  className={cn(
                    "bg-white border rounded-xl p-4 transition-all",
                    isWon
                      ? "border-emerald-200 hover:border-emerald-300"
                      : "border-red-200 hover:border-red-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-bold",
                        isWon
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {rfp.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {rfp.title}
                      </p>
                      <p className="text-xs text-gray-500">{client}</p>
                    </div>
                    {value > 0 && (
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isWon ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        {fmtCurrency(value)}
                      </p>
                    )}
                  </div>
                  {!isWon && reason && (
                    <p className="text-xs text-red-500 mt-2 ml-16">
                      Reason: {reason}
                    </p>
                  )}
                  {isWon && value > 0 && (
                    <p className="text-xs text-emerald-500 mt-2 ml-16">
                      Contract value: {fmtCurrency(value)}
                    </p>
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
