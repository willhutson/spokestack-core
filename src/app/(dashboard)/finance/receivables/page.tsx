"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import StatusBadge from "@/components/shared/StatusBadge";
import FinanceNav from "../FinanceNav";

interface Receivable {
  id: string;
  number: string;
  clientId: string | null;
  client: { id: string; name: string } | null;
  status: string;
  totalCents: number;
  currency: string;
  issuedAt: string | null;
  dueDate: string | null;
  daysOverdue: number;
}

type Bucket = "all" | "current" | "31-60" | "61-90" | "90+";

const aedFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

function getBucket(days: number): Exclude<Bucket, "all"> {
  if (days <= 30) return "current";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function bucketLabel(b: Exclude<Bucket, "all">) {
  switch (b) {
    case "current": return "Current (0-30d)";
    case "31-60": return "31-60 days";
    case "61-90": return "61-90 days";
    case "90+": return "90+ days";
  }
}

function bucketColor(b: Exclude<Bucket, "all">) {
  switch (b) {
    case "current": return "border-emerald-200 bg-emerald-50";
    case "31-60": return "border-yellow-200 bg-yellow-50";
    case "61-90": return "border-orange-200 bg-orange-50";
    case "90+": return "border-red-200 bg-red-50";
  }
}

function bucketValueColor(b: Exclude<Bucket, "all">) {
  switch (b) {
    case "current": return "text-emerald-700";
    case "31-60": return "text-yellow-700";
    case "61-90": return "text-orange-700";
    case "90+": return "text-red-700";
  }
}

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBucket, setActiveBucket] = useState<Bucket>("all");

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/finance/receivables", { headers });
      if (res.ok) {
        const data = await res.json();
        setReceivables(data.receivables ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const buckets: Record<Exclude<Bucket, "all">, Receivable[]> = {
    current: [],
    "31-60": [],
    "61-90": [],
    "90+": [],
  };
  for (const r of receivables) {
    buckets[getBucket(r.daysOverdue)].push(r);
  }

  const bucketTotals = (Object.keys(buckets) as Exclude<Bucket, "all">[]).map((b) => ({
    key: b,
    label: bucketLabel(b),
    total: buckets[b].reduce((s, r) => s + r.totalCents, 0),
    count: buckets[b].length,
  }));

  const filtered = activeBucket === "all" ? receivables : buckets[activeBucket];

  return (
    <ModuleLayoutShell moduleType="FINANCE">
      <div className="p-6">
        <FinanceNav />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Receivables</h1>
          <p className="text-sm text-gray-500 mt-0.5">Outstanding invoices and aging analysis.</p>
        </div>

        {/* Aging bucket cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                <div className="h-6 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {bucketTotals.map((bt) => (
              <button
                key={bt.key}
                onClick={() => setActiveBucket(activeBucket === bt.key ? "all" : bt.key)}
                className={`text-left border rounded-xl p-5 transition-all ${
                  activeBucket === bt.key
                    ? `${bucketColor(bt.key)} ring-2 ring-offset-1 ring-indigo-400`
                    : `${bucketColor(bt.key)} hover:shadow-sm`
                }`}
              >
                <p className="text-xs font-medium text-gray-600 mb-1">{bt.label}</p>
                <p className={`text-lg font-bold ${bucketValueColor(bt.key)}`}>
                  {aedFormatter.format(bt.total / 100)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{bt.count} invoice{bt.count !== 1 ? "s" : ""}</p>
              </button>
            ))}
          </div>
        )}

        {activeBucket !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Filtering: <span className="font-medium">{bucketLabel(activeBucket)}</span>
            </span>
            <button
              onClick={() => setActiveBucket("all")}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Invoice table */}
        {loading ? (
          <div className="animate-pulse">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">No outstanding receivables</h3>
            <p className="text-xs text-gray-500">All invoices are up to date.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Invoice #</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Issue Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Due Date</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Days Overdue</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-900">{r.client?.name || "-"}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{r.number}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {r.issuedAt ? new Date(r.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                      {aedFormatter.format(r.totalCents / 100)}
                    </td>
                    <td className={`px-5 py-4 text-right text-sm font-medium ${r.daysOverdue > 30 ? "text-red-600" : "text-gray-700"}`}>
                      {r.daysOverdue > 0 ? `${r.daysOverdue}d` : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
