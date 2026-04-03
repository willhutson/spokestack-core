"use client";

import { useState, useEffect, useCallback } from "react";
import StatusBadge from "@/components/shared/StatusBadge";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface OrderItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  total: number;
  currency: string;
  notes?: string;
  invoiceId?: string;
  createdAt: string;
  items: OrderItem[];
}

interface Client {
  id: string;
  name: string;
}

const aedFmt = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" });

const PIPELINE = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] as const;
const COL_COLORS: Record<string, string> = {
  PENDING: "border-gray-300 bg-gray-50",
  CONFIRMED: "border-blue-300 bg-blue-50",
  IN_PROGRESS: "border-amber-300 bg-amber-50",
  COMPLETED: "border-emerald-300 bg-emerald-50",
};

const NEXT_STATUS: Record<string, { label: string; to: string }> = {
  PENDING: { label: "Confirm", to: "CONFIRMED" },
  CONFIRMED: { label: "Start", to: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Complete", to: "COMPLETED" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Create form
  const [formClient, setFormClient] = useState("");
  const [formItems, setFormItems] = useState<OrderItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/orders", { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? data ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/clients", { headers });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients ?? data ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadOrders(); loadClients(); }, [loadOrders, loadClients]);

  async function updateStatus(id: string, newStatus: string) {
    setUpdating(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/orders/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
      }
    } catch { /* ignore */ } finally { setUpdating(null); }
  }

  async function generateInvoice(id: string) {
    setUpdating(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/orders/${id}/invoice`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, invoiceId: data.invoiceId ?? data.id } : o))
        );
      }
    } catch { /* ignore */ } finally { setUpdating(null); }
  }

  function updateFormItem(idx: number, field: keyof OrderItem, value: string | number) {
    setFormItems((prev) => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formClient) { setFormError("Select a client."); return; }
    const valid = formItems.filter((it) => it.description.trim());
    if (!valid.length) { setFormError("Add at least one item."); return; }
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formClient,
          items: valid.map((it) => ({ description: it.description, quantity: it.quantity, unitPriceCents: Math.round(it.unitPrice * 100) })),
          notes: formNotes.trim() || undefined,
        }),
      });
      if (!res.ok) { setFormError(await res.text() || res.statusText); return; }
      setFormClient(""); setFormItems([{ description: "", quantity: 1, unitPrice: 0 }]); setFormNotes("");
      setShowForm(false); setLoading(true); loadOrders();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unexpected error");
    } finally { setSubmitting(false); }
  }

  // Stats
  const totalOrders = orders.length;
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const revenue = orders.filter((o) => o.status === "COMPLETED").reduce((s, o) => s + (o.total ?? 0), 0);

  // Bucket
  const buckets: Record<string, Order[]> = { PENDING: [], CONFIRMED: [], IN_PROGRESS: [], COMPLETED: [] };
  orders.forEach((o) => {
    const key = PIPELINE.includes(o.status as typeof PIPELINE[number]) ? o.status : "PENDING";
    buckets[key].push(o);
  });

  const formTotal = formItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track customer orders, invoices, and fulfillment</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openChatWithContext("Summarize my current orders and fulfillment status")}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Ask Agent
          </button>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
              + Create Order
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Revenue (Completed)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{aedFmt.format(revenue)}</p>
        </div>
      </div>

      {/* Create Order Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">New Order</h2>
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <select value={formClient} onChange={(e) => setFormClient(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="space-y-2">
              {formItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateFormItem(idx, "description", e.target.value)} className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="number" min={1} value={item.quantity} onChange={(e) => updateFormItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))} className="w-20 h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="number" min={0} step={0.01} placeholder="AED" value={item.unitPrice || ""} onChange={(e) => updateFormItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="w-28 h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="button" onClick={() => formItems.length > 1 && setFormItems((p) => p.filter((_, i) => i !== idx))} disabled={formItems.length <= 1} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors">&times;</button>
                </div>
              ))}
              <button type="button" onClick={() => setFormItems((p) => [...p, { description: "", quantity: 1, unitPrice: 0 }])} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">+ Add Item</button>
            </div>
            <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} placeholder="Notes (optional)" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-600">Total: <span className="font-semibold text-gray-900">{aedFmt.format(formTotal)}</span></span>
              <div className="flex items-center gap-3">
                {formError && <p className="text-xs text-red-600">{formError}</p>}
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {submitting ? "Creating..." : "Create Order"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Pipeline */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-400">Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-1">No orders yet</h3>
          <p className="text-xs text-gray-500 mb-4">Create your first order to start tracking customer transactions.</p>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Create Order</button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {PIPELINE.map((col) => (
            <div key={col} className={`rounded-xl border-2 p-3 min-h-[300px] ${COL_COLORS[col]}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{col.replace(/_/g, " ")}</h3>
                <span className="text-xs font-medium text-gray-500 bg-white rounded-full px-2 py-0.5">{buckets[col].length}</span>
              </div>
              <div className="space-y-3">
                {buckets[col].map((order) => {
                  const isExpanded = expandedId === order.id;
                  const next = NEXT_STATUS[col];
                  return (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-3 transition-shadow hover:shadow-md">
                      <div className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-sm font-semibold text-gray-900">#{order.orderNumber}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-gray-500">{order.customerName}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{aedFmt.format(order.total ?? 0)}</span>
                          <span>{order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}</span>
                          <span>{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {order.items?.length > 0 && (
                            <table className="w-full text-xs mb-2">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left pb-1">Item</th>
                                  <th className="text-right pb-1">Qty</th>
                                  <th className="text-right pb-1">Price</th>
                                  <th className="text-right pb-1">Total</th>
                                </tr>
                              </thead>
                              <tbody className="text-gray-700">
                                {order.items.map((it, i) => (
                                  <tr key={i}>
                                    <td className="py-0.5">{it.description}</td>
                                    <td className="text-right">{it.quantity}</td>
                                    <td className="text-right">{aedFmt.format(it.unitPrice)}</td>
                                    <td className="text-right">{aedFmt.format(it.quantity * it.unitPrice)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {order.notes && <p className="text-xs text-gray-500 mb-2">Notes: {order.notes}</p>}
                          {order.invoiceId && <p className="text-xs text-indigo-600 mb-2">Invoice: {order.invoiceId}</p>}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {next && (
                          <button
                            disabled={updating === order.id}
                            onClick={() => updateStatus(order.id, next.to)}
                            className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
                          >
                            {next.label}
                          </button>
                        )}
                        {col === "COMPLETED" && !order.invoiceId && (
                          <button
                            disabled={updating === order.id}
                            onClick={() => generateInvoice(order.id)}
                            className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                          >
                            Generate Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
