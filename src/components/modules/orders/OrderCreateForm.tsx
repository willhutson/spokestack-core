"use client";

import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/client-auth";

interface Client {
  id: string;
  name: string;
}

interface OrderItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface OrderCreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export default function OrderCreateForm({
  onCreated,
  onCancel,
}: OrderCreateFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClients() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/clients", { headers });
        if (res.ok) {
          const data = await res.json();
          setClients(data.clients ?? data ?? []);
        }
      } catch {
        // Clients endpoint not available
      } finally {
        setClientsLoading(false);
      }
    }
    loadClients();
  }, []);

  function updateItem(
    index: number,
    field: keyof OrderItem,
    value: string | number
  ) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!clientId) {
      setSubmitError("Please select a client.");
      return;
    }

    const validItems = items.filter((it) => it.description.trim() !== "");
    if (validItems.length === 0) {
      setSubmitError("Please add at least one item with a description.");
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          items: validItems.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPriceCents: Math.round(it.unitPrice * 100),
          })),
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        setSubmitError(`Failed to create order: ${body || res.statusText}`);
        return;
      }

      onCreated();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const total = items.reduce(
    (sum, it) => sum + it.quantity * it.unitPrice,
    0
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">New Order</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Client */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Client <span className="text-red-500">*</span>
          </label>
          {clientsLoading ? (
            <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Items */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Items
          </label>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(idx, "description", e.target.value)
                  }
                  className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(
                      idx,
                      "quantity",
                      Math.max(1, parseInt(e.target.value) || 1)
                    )
                  }
                  className="w-20 h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="number"
                  placeholder="Price"
                  min={0}
                  step={0.01}
                  value={item.unitPrice || ""}
                  onChange={(e) =>
                    updateItem(
                      idx,
                      "unitPrice",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-28 h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                  className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
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
            Add Item
          </button>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Total & Submit */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            Total:{" "}
            <span className="font-semibold text-gray-900">
              {total.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {submitError && (
              <p className="text-xs text-red-600">{submitError}</p>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Creating..." : "Create Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
