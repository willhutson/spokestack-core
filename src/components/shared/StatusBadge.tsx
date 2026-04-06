const STATUS_STYLES: Record<string, string> = {
  TODO: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  DONE: "bg-emerald-50 text-emerald-600",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  ACTIVE: "bg-emerald-50 text-emerald-600",
  PLANNING: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  ON_HOLD: "bg-amber-50 text-amber-600",
  CANCELED: "bg-red-50 text-red-600",
  CANCELLED: "bg-red-50 text-red-600",
  PENDING: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  DRAFT: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  IN_REVIEW: "bg-purple-50 text-purple-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
  CONFIRMED: "bg-blue-50 text-blue-600",
  ARCHIVED: "bg-[var(--bg-surface)] text-[var(--text-tertiary)]",
  SENT: "bg-blue-50 text-blue-600",
  PAID: "bg-emerald-50 text-emerald-600",
  OVERDUE: "bg-red-50 text-red-600",
  VOID: "bg-[var(--bg-surface)] text-[var(--text-tertiary)]",
};

export default function StatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status?.toUpperCase()] ?? "bg-[var(--bg-surface)] text-[var(--text-tertiary)]";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {(status ?? "").replace(/_/g, " ")}
    </span>
  );
}
