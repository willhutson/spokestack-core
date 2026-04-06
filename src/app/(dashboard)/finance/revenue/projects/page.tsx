"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import FinanceNav from "../../FinanceNav";

interface ProjectRevenue {
  name: string;
  client: string;
  revenue: number;
  cost: number;
}

const aedFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

function marginColor(margin: number) {
  if (margin >= 40) return "text-emerald-600";
  if (margin >= 20) return "text-amber-600";
  return "text-red-600";
}

function marginBgColor(margin: number) {
  if (margin >= 40) return "bg-emerald-50 text-emerald-700";
  if (margin >= 20) return "bg-yellow-50 text-yellow-700";
  return "bg-red-50 text-red-700";
}

export default function RevenueProjectsPage() {
  const [data, setData] = useState<ProjectRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/finance/revenue?groupBy=project", { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json.revenue ?? []);
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

  return (
    <ModuleLayoutShell moduleType="FINANCE">
      <div className="p-6">
        <FinanceNav />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue by Project</h1>
            <p className="text-sm text-gray-500 mt-0.5">Project-level revenue, cost, and margin analysis.</p>
          </div>
          <Link
            href="/finance/revenue"
            className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            View by Client
          </Link>
        </div>

        {loading ? (
          <div className="animate-pulse">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">No project revenue data</h3>
            <p className="text-xs text-gray-500">Revenue will appear once orders are completed.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Project</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Revenue</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Cost</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row) => {
                  const margin = row.revenue > 0 ? ((row.revenue - row.cost) / row.revenue) * 100 : 0;
                  return (
                    <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{row.client}</td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                        {aedFormatter.format(row.revenue / 100)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-gray-600">
                        {aedFormatter.format(row.cost / 100)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${marginBgColor(margin)}`}>
                          {margin.toFixed(1)}%
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
