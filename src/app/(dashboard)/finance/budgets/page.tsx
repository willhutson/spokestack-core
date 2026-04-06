"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import FinanceNav from "../FinanceNav";

interface BudgetValue {
  projectName: string;
  allocated: number;
  spent: number;
}

interface BudgetEntry {
  id: string;
  key: string;
  value: BudgetValue;
  createdAt: string;
}

const aedFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

function utilizationColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 75) return "bg-yellow-500";
  return "bg-emerald-500";
}

function utilizationTextColor(pct: number) {
  if (pct >= 90) return "text-red-600";
  if (pct >= 75) return "text-amber-600";
  return "text-emerald-600";
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formProject, setFormProject] = useState("");
  const [formAllocated, setFormAllocated] = useState("");
  const [formSpent, setFormSpent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadBudgets = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/finance/budgets", { headers });
      if (res.ok) {
        const data = await res.json();
        setBudgets(
          (data.budgets ?? []).map((b: { id: string; key: string; value: unknown; createdAt: string }) => ({
            ...b,
            value: b.value as BudgetValue,
          }))
        );
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleCreate = async () => {
    if (!formProject || !formAllocated) return;
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/finance/budgets", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          key: formProject.toLowerCase().replace(/\s+/g, "-"),
          value: {
            projectName: formProject,
            allocated: Math.round(parseFloat(formAllocated) * 100),
            spent: Math.round(parseFloat(formSpent || "0") * 100),
          },
        }),
      });
      if (res.ok) {
        setFormProject("");
        setFormAllocated("");
        setFormSpent("");
        setShowForm(false);
        loadBudgets();
      }
    } catch {
      // error
    } finally {
      setSubmitting(false);
    }
  };

  const totalAllocated = budgets.reduce((s, b) => s + (b.value.allocated || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.value.spent || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const totalUtilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  return (
    <ModuleLayoutShell moduleType="FINANCE">
      <div className="p-6">
        <FinanceNav />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track budget allocation and utilization by project.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showForm ? "Cancel" : "New Budget"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Create Budget</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project Name</label>
                <input
                  type="text"
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Website Redesign"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allocated (AED)</label>
                <input
                  type="number"
                  value={formAllocated}
                  onChange={(e) => setFormAllocated(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Spent (AED)</label>
                <input
                  type="number"
                  value={formSpent}
                  onChange={(e) => setFormSpent(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCreate}
                disabled={submitting || !formProject || !formAllocated}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Creating..." : "Create Budget"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : budgets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">No budgets yet</h3>
            <p className="text-xs text-gray-500">Click &quot;New Budget&quot; to create your first budget entry.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Project</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Allocated</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Spent</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Remaining</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 w-48">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {budgets.map((b) => {
                  const allocated = b.value.allocated || 0;
                  const spent = b.value.spent || 0;
                  const remaining = allocated - spent;
                  const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">{b.value.projectName || b.key}</td>
                      <td className="px-5 py-4 text-right text-sm text-gray-700">{aedFormatter.format(allocated / 100)}</td>
                      <td className="px-5 py-4 text-right text-sm text-gray-700">{aedFormatter.format(spent / 100)}</td>
                      <td className={`px-5 py-4 text-right text-sm font-medium ${remaining < 0 ? "text-red-600" : "text-gray-900"}`}>
                        {aedFormatter.format(remaining / 100)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${utilizationColor(pct)}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${utilizationTextColor(pct)}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Summary row */}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td className="px-5 py-4 text-sm text-gray-900">Total</td>
                  <td className="px-5 py-4 text-right text-sm text-gray-900">{aedFormatter.format(totalAllocated / 100)}</td>
                  <td className="px-5 py-4 text-right text-sm text-gray-900">{aedFormatter.format(totalSpent / 100)}</td>
                  <td className={`px-5 py-4 text-right text-sm ${totalRemaining < 0 ? "text-red-600" : "text-gray-900"}`}>
                    {aedFormatter.format(totalRemaining / 100)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${utilizationColor(totalUtilization)}`}
                          style={{ width: `${Math.min(totalUtilization, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${utilizationTextColor(totalUtilization)}`}>{totalUtilization}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
