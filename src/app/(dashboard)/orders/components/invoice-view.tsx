"use client";

interface InvoiceViewProps {
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    items: { name: string; quantity: number; unitPrice: number }[];
  };
  onClose: () => void;
}

export default function InvoiceView({ order, onClose }: InvoiceViewProps) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency || "USD",
  });

  const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * 0.1; // placeholder 10% tax

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-base)] rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Invoice #{order.orderNumber}</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Invoice meta */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Bill To</label>
              <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{order.customerName}</p>
            </div>
            <div className="text-right">
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Date</label>
              <p className="text-sm text-[var(--text-primary)] mt-0.5">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Line items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] pb-2">Item</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] pb-2">Qty</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] pb-2">Price</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] pb-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-sm text-[var(--text-primary)]">{item.name}</td>
                  <td className="py-2.5 text-sm text-[var(--text-secondary)] text-right">{item.quantity}</td>
                  <td className="py-2.5 text-sm text-[var(--text-secondary)] text-right">{formatter.format(item.unitPrice)}</td>
                  <td className="py-2.5 text-sm font-medium text-[var(--text-primary)] text-right">
                    {formatter.format(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-[var(--border)] pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Subtotal</span>
              <span className="text-[var(--text-primary)]">{formatter.format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Tax (10%)</span>
              <span className="text-[var(--text-primary)]">{formatter.format(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-[var(--border)]">
              <span className="text-[var(--text-primary)]">Total</span>
              <span className="text-[var(--text-primary)]">{formatter.format(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            Close
          </button>
          <button className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-md hover:bg-[var(--accent-hover)] transition-colors">
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
