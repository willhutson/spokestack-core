"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import StatusBadge from "@/components/shared/StatusBadge";
import { openChatWithContext } from "@/lib/chat-event";

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Financial tracking, invoices, and orders.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openChatWithContext("Create an invoice for a client")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            New Invoice
          </button>
          <button
            onClick={() => openChatWithContext("Help me analyze my revenue and outstanding invoices")}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
            Ask Agent
          </button>
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
            <p className="text-xs font-medium text-gray-500 mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-emerald-600">{aedFormatter.format(totalRevenue / 100)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Outstanding</p>
            <p className="text-xl font-bold text-amber-600">{aedFormatter.format(outstanding / 100)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Total Orders</p>
            <p className="text-xl font-bold text-gray-900">{orderCount}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        {(["invoices", "orders"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="animate-pulse">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
                <div className="h-4 w-24 bg-gray-200 rounded ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : tab === "invoices" ? (
        invoices.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No invoices yet</h3>
            <p className="text-xs text-gray-500">Invoices will appear here once created.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Number</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Total</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{inv.invoiceNumber || `INV-${inv.id.slice(-6)}`}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{inv.client?.name || "-"}</td>
                    <td className="px-5 py-4"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">{aedFormatter.format(inv.totalCents / 100)}</td>
                    <td className="px-5 py-4 text-right text-xs text-gray-500">{new Date(inv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No orders yet</h3>
          <p className="text-xs text-gray-500">Orders will appear here once created.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Order #</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Total</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-gray-900">#{order.id.slice(-6)}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{order.client?.name || "-"}</td>
                  <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">{aedFormatter.format(order.totalCents / 100)}</td>
                  <td className="px-5 py-4 text-right text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
