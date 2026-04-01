const STATUS_STYLES: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  DONE: "bg-emerald-50 text-emerald-600",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  ACTIVE: "bg-emerald-50 text-emerald-600",
  PLANNING: "bg-gray-100 text-gray-600",
  ON_HOLD: "bg-amber-50 text-amber-600",
  CANCELED: "bg-red-50 text-red-600",
  CANCELLED: "bg-red-50 text-red-600",
  PENDING: "bg-gray-100 text-gray-600",
  DRAFT: "bg-gray-100 text-gray-600",
  IN_REVIEW: "bg-purple-50 text-purple-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
  CONFIRMED: "bg-blue-50 text-blue-600",
  ARCHIVED: "bg-gray-100 text-gray-500",
  SENT: "bg-blue-50 text-blue-600",
  PAID: "bg-emerald-50 text-emerald-600",
  OVERDUE: "bg-red-50 text-red-600",
  VOID: "bg-gray-100 text-gray-500",
};

export default function StatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status?.toUpperCase()] ?? "bg-gray-100 text-gray-500";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {(status ?? "").replace(/_/g, " ")}
    </span>
  );
}
