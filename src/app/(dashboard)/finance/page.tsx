"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import StatusBadge from "@/components/shared/StatusBadge";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import FinanceNav from "./FinanceNav";

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  client: { id: string; name: string } | null;
  order: { id: string } | null;
}

interface Order {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  client: { id: string; name: string } | null;
}

const aedFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

type Tab = "invoices" | "orders";

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("invoices");

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [invRes, ordRes] = await Promise.all([
        fetch("/api/v1/invoices", { headers }),
        fetch("/api/v1/orders", { headers }),
      ]);
      if (invRes.ok) {
        const data = await invRes.json();
        setInvoices(data.invoices ?? []);
      }
      if (ordRes.ok) {
        const data = await ordRes.json();
        setOrders(data.orders ?? []);
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

  const totalRevenue = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.totalCents, 0);

  const outstanding = invoices
    .filter((inv) => inv.status !== "PAID" && inv.status !== "VOID")
    .reduce((sum, inv) => sum + inv.totalCents, 0);

  const orderCount = orders.length;

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invClient, setInvClient] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDueDate, setInvDueDate] = useState("");
  const [invSubmitting, setInvSubmitting] = useState(false);

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!invAmount) return;
    setInvSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: invClient.trim() || undefined,
          currency: "AED",
          items: [{ description: "Invoice item", quantity: 1, unitPriceCents: Math.round(parseFloat(invAmount) * 100) }],
        }),
      });
      if (res.ok) {
        setShowInvoiceForm(false);
        setInvClient(""); setInvAmount(""); setInvDueDate("");
        setLoading(true);
        loadData();
      }
    } catch { /* ignore */ } finally { setInvSubmitting(false); }
  }

  return (
    <ModuleLayoutShell moduleType="FINANCE">
      <div className="p-6">
      <FinanceNav />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Finance</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Financial tracking, invoices, and orders.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInvoiceForm(!showInvoiceForm)} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
            {showInvoiceForm ? "Cancel" : "+ New Transaction"}
          </button>
        </div>
      </div>

      {showInvoiceForm && (
        <form onSubmit={handleCreateInvoice} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">New Transaction</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" value={invClient} onChange={(e) => setInvClient(e.target.value)} placeholder="Client name (optional)" className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <input type="number" step="0.01" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} placeholder="Amount (AED) *" className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
          </div>
          <button type="submit" disabled={invSubmitting || !invAmount} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
            {invSubmitting ? "Creating..." : "Create Transaction"}
          </button>
        </form>
      )}

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
              <div className="h-3 w-20 bg-[var(--bg-surface)] rounded mb-2" />
              <div className="h-6 w-28 bg-[var(--bg-surface)] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-emerald-600">{aedFormatter.format(totalRevenue / 100)}</p>
          </div>
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Outstanding</p>
            <p className="text-xl font-bold text-amber-600">{aedFormatter.format(outstanding / 100)}</p>
          </div>
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Total Orders</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{orderCount}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[var(--border)]">
        {(["invoices", "orders"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="animate-pulse">
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-[var(--border)] last:border-b-0">
                <div className="h-4 w-16 bg-[var(--bg-surface)] rounded" />
                <div className="h-4 w-32 bg-[var(--bg-surface)] rounded" />
                <div className="h-5 w-16 bg-[var(--bg-surface)] rounded-full" />
                <div className="h-4 w-24 bg-[var(--bg-surface)] rounded ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : tab === "invoices" ? (
        invoices.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No invoices yet</h3>
            <p className="text-xs text-[var(--text-secondary)]">Invoices will appear here once created.</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Number</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Total</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">{inv.invoiceNumber || `INV-${inv.id.slice(-6)}`}</td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{inv.client?.name || "-"}</td>
                    <td className="px-5 py-4"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-4 text-right text-sm font-medium text-[var(--text-primary)]">{aedFormatter.format(inv.totalCents / 100)}</td>
                    <td className="px-5 py-4 text-right text-xs text-[var(--text-secondary)]">{new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : orders.length === 0 ? (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No orders yet</h3>
          <p className="text-xs text-[var(--text-secondary)]">Orders will appear here once created.</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-base)]">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Order #</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Client</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Total</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">#{order.id.slice(-6)}</td>
                  <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{order.client?.name || "-"}</td>
                  <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-5 py-4 text-right text-sm font-medium text-[var(--text-primary)]">{aedFormatter.format(order.totalCents / 100)}</td>
                  <td className="px-5 py-4 text-right text-xs text-[var(--text-secondary)]">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
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
