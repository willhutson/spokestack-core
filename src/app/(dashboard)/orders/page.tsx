"use client";

import { useState, useEffect } from "react";
import StatusBadge from "@/components/shared/StatusBadge";
import { openChatWithContext } from "@/lib/chat-event";
import { createClient } from "@/lib/supabase/client";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  });

async function getAuthHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/orders", { headers });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders ?? data ?? []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track customer orders, invoices, and fulfillment
          </p>
        </div>
        <button
          onClick={() =>
            openChatWithContext(
              "Help me create a new order for a customer"
            )
          }
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Create Order
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-400">Loading orders...</div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            No orders yet
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Create your first order to start tracking customer transactions.
          </p>
          <button
            onClick={() =>
              openChatWithContext(
                "Help me create a new order for a customer"
              )
            }
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Create Order
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                  Order #
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                  Customer
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                  Total
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      #{order.orderNumber}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {order.customerName}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                    {currencyFormatter(order.currency).format(order.total)}
                  </td>
                  <td className="px-5 py-4 text-right text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
