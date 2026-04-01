const STATUS_STYLES: Record<string, string> = {
  TODO: "bg-gray-500/20 text-gray-300",
  IN_PROGRESS: "bg-blue-500/20 text-blue-300",
  DONE: "bg-green-500/20 text-green-300",
  PLANNING: "bg-gray-500/20 text-gray-300",
  ACTIVE: "bg-blue-500/20 text-blue-300",
  COMPLETED: "bg-green-500/20 text-green-300",
  ON_HOLD: "bg-yellow-500/20 text-yellow-300",
  CANCELLED: "bg-red-500/20 text-red-300",
  CANCELED: "bg-red-500/20 text-red-300",
  DRAFT: "bg-gray-500/20 text-gray-300",
  IN_REVIEW: "bg-orange-500/20 text-orange-300",
  APPROVED: "bg-green-500/20 text-green-300",
  REJECTED: "bg-red-500/20 text-red-300",
  PENDING: "bg-yellow-500/20 text-yellow-300",
  CONFIRMED: "bg-blue-500/20 text-blue-300",
  PROCESSING: "bg-blue-500/20 text-blue-300",
  FULFILLED: "bg-green-500/20 text-green-300",
  ARCHIVED: "bg-gray-500/20 text-gray-400",
  SENT: "bg-blue-500/20 text-blue-300",
  PAID: "bg-green-500/20 text-green-300",
  OVERDUE: "bg-red-500/20 text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  ON_HOLD: "On Hold",
};

export function StatusBadge({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const style = STATUS_STYLES[status] ?? "bg-gray-500/20 text-gray-300";
  const label =
    STATUS_LABELS[status] ??
    status.charAt(0) +
      status
        .slice(1)
        .toLowerCase()
        .replace(/_/g, " ");
  return (
    <span
      className={`rounded-full font-medium ${style} ${size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"}`}
    >
      {label}
    </span>
  );
}
