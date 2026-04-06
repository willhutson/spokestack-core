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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
  }).format(amount);
}

function daysRemaining(deadlineStr: string | undefined): number | null {
  if (!deadlineStr) return null;
  const diff = new Date(deadlineStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function deadlineColor(days: number | null): string {
  if (days === null) return "text-[var(--text-secondary)]";
  if (days < 7) return "text-red-600 font-semibold";
  if (days < 14) return "text-amber-600 font-medium";
  return "text-[var(--text-secondary)]";
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  REVIEW: "bg-purple-50 text-purple-600",
  SUBMITTED: "bg-[var(--accent-subtle)] text-[var(--accent)]",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ActiveRfpPage() {
  const [rfps, setRfps] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", { headers });
      if (res.ok) {
        const data = await res.json();
        const allBriefs: Brief[] = data.briefs ?? [];
        const active = allBriefs.filter((b) => {
          const isRfp =
            (b.metadata?.type as string)?.toUpperCase() === "RFP" ||
            b.title?.toLowerCase().includes("rfp");
          const isActive = b.status !== "WON" && b.status !== "LOST";
          return isRfp && isActive;
        });
        setRfps(active);
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

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">RFP</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Active proposals requiring attention.
          </p>
        </div>

        <RfpNav />

        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Active RFPs ({rfps.length})
        </h2>

        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 animate-pulse">
            <div className="h-4 w-48 bg-[var(--bg-surface)] rounded mb-4" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--bg-surface)] rounded mb-2" />
            ))}
          </div>
        ) : rfps.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-tertiary)] text-sm bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
            No active RFPs.
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-base)]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase">
                    Title
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase">
                    Client
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase">
                    Est. Value
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase">
                    Deadline
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase">
                    Days Left
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rfps.map((rfp) => {
                  const client =
                    rfp.clientName ||
                    (rfp.metadata?.client as string) ||
                    "--";
                  const value = Number(rfp.metadata?.value) || 0;
                  const deadline = rfp.metadata?.deadline as
                    | string
                    | undefined;
                  const days = daysRemaining(deadline);

                  return (
                    <tr key={rfp.id} className="hover:bg-[var(--bg-hover)]">
                      <td className="px-5 py-3">
                        <p className="font-medium text-[var(--text-primary)] truncate max-w-xs">
                          {rfp.title}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-secondary)]">{client}</td>
                      <td className="px-5 py-3 text-right font-medium text-[var(--text-primary)]">
                        {value > 0 ? fmtCurrency(value) : "--"}
                      </td>
                      <td className="px-5 py-3 text-[var(--text-secondary)]">
                        {deadline
                          ? new Date(deadline).toLocaleDateString()
                          : "--"}
                      </td>
                      <td
                        className={cn(
                          "px-5 py-3 text-center",
                          deadlineColor(days)
                        )}
                      >
                        {days !== null ? `${days}d` : "--"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            STATUS_COLORS[rfp.status] ||
                              STATUS_COLORS.DRAFT
                          )}
                        >
                          {rfp.status || "DRAFT"}
                        </span>
                      </td>
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
