"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import FinanceNav from "../FinanceNav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CashFlowMonth {
  month: string;
  income: number;
  expenses: number;
}

const aedFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

type Period = 3 | 6 | 12;

export default function CashFlowPage() {
  const [data, setData] = useState<CashFlowMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(12);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/finance/cashflow?period=${period}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json.cashflow ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalIncome = data.reduce((s, d) => s + d.income, 0);
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0);
  const netCashFlow = totalIncome - totalExpenses;

  const chartData = data.map((d) => ({
    month: d.month,
    Income: d.income / 100,
    Expenses: d.expenses / 100,
  }));

  return (
    <ModuleLayoutShell moduleType="FINANCE">
      <div className="p-6">
        <FinanceNav />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Flow</h1>
            <p className="text-sm text-gray-500 mt-0.5">Monthly income and expenses overview.</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {([3, 6, 12] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p}m
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-6 w-28 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-500 mb-1">Total Income</p>
              <p className="text-xl font-bold text-emerald-600">{aedFormatter.format(totalIncome / 100)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-500 mb-1">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">{aedFormatter.format(totalExpenses / 100)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-500 mb-1">Net Cash Flow</p>
              <p className={`text-xl font-bold ${netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {aedFormatter.format(netCashFlow / 100)}
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        {!loading && chartData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Cash Flow</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => aedFormatter.format(value)}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Transaction table */}
        {!loading && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Monthly Breakdown</h3>
            </div>
            {data.length === 0 ? (
              <div className="p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No cash flow data</h3>
                <p className="text-xs text-gray-500">Data will appear once orders are recorded.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Month</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Income</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Expenses</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row) => {
                    const net = row.income - row.expenses;
                    return (
                      <tr key={row.month} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">{row.month}</td>
                        <td className="px-5 py-4 text-right text-sm text-emerald-600">{aedFormatter.format(row.income / 100)}</td>
                        <td className="px-5 py-4 text-right text-sm text-red-600">{aedFormatter.format(row.expenses / 100)}</td>
                        <td className={`px-5 py-4 text-right text-sm font-medium ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {aedFormatter.format(net / 100)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
