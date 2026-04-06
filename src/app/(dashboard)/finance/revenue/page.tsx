"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import FinanceNav from "../FinanceNav";

interface RevenueRow {
  name: string;
  revenue: number;
  orderCount: number;
}

const aedFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

export default function RevenuePage() {
  const [data, setData] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/finance/revenue?groupBy=client", { headers });
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

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.orderCount, 0);

  return (
    <ModuleLayoutShell moduleType="FINANCE">
      <div className="p-6">
        <FinanceNav />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
            <p className="text-sm text-gray-500 mt-0.5">Revenue breakdown by client.</p>
          </div>
          <Link
            href="/finance/revenue/projects"
            className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            View by Project
          </Link>
        </div>

        {/* Summary */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-500 mb-1">Total Revenue (YTD)</p>
              <p className="text-xl font-bold text-emerald-600">{aedFormatter.format(totalRevenue / 100)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-500 mb-1">Completed Orders</p>
              <p className="text-xl font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">No revenue data</h3>
            <p className="text-xs text-gray-500">Revenue will appear once orders are completed.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">#</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">YTD Revenue</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Orders</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, idx) => {
                  const share = totalRevenue > 0 ? ((row.revenue / totalRevenue) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                        {aedFormatter.format(row.revenue / 100)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-gray-600">{row.orderCount}</td>
                      <td className="px-5 py-4 text-right text-sm text-gray-500">{share}%</td>
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
