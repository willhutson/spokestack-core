"use client";

export interface CanvasNodeData {
  id: string;
  entityType: "TASK" | "PROJECT" | "BRIEF" | "ORDER" | "MILESTONE" | "AGENT_ACTION";
  entityId: string;
  label: string;
  status: string;
  priority?: string;
  positionX: number;
  positionY: number;
  metadata?: Record<string, unknown>;
}

interface Props {
  node: CanvasNodeData;
  selected: boolean;
  onClick: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  TODO: "border-gray-600",
  PENDING: "border-gray-600",
  PLANNING: "border-gray-600",
  DRAFT: "border-gray-600",
  IN_PROGRESS: "border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]",
  ACTIVE: "border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]",
  IN_REVIEW: "border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
  CONFIRMED: "border-blue-500",
  DONE: "border-emerald-500",
  COMPLETED: "border-emerald-500",
  APPROVED: "border-emerald-500",
  ARCHIVED: "border-gray-700 opacity-50",
  CANCELED: "border-gray-700 opacity-50",
};

const PRIORITY_DOTS: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-gray-500",
};

const TYPE_LABELS: Record<string, string> = {
  TASK: "Task",
  PROJECT: "Project",
  BRIEF: "Brief",
  ORDER: "Order",
  MILESTONE: "Milestone",
  AGENT_ACTION: "Agent",
};

const TYPE_WIDTHS: Record<string, string> = {
  PROJECT: "w-52",
  TASK: "w-44",
  BRIEF: "w-44",
  ORDER: "w-44",
  MILESTONE: "w-36",
  AGENT_ACTION: "w-32",
};

export default function CanvasNode({ node, selected, onClick }: Props) {
  const borderColor = STATUS_STYLES[node.status] ?? "border-gray-600";
  const isActive = ["IN_PROGRESS", "ACTIVE"].includes(node.status);
  const isDone = ["DONE", "COMPLETED", "APPROVED"].includes(node.status);
  const width = TYPE_WIDTHS[node.entityType] ?? "w-44";

  return (
    <div
      onClick={onClick}
      className={`absolute cursor-pointer transition-all duration-200 hover:scale-105 ${width}`}
      style={{
        left: node.positionX,
        top: node.positionY,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className={`bg-gray-900 rounded-lg border-l-[3px] p-3 ${borderColor} ${
          selected ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-950" : ""
        } ${isActive ? "animate-pulse" : ""}`}
        style={isActive ? { animationDuration: "3s" } : undefined}
      >
        {/* Header: priority + type label */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            {node.priority && (
              <span
                className={`w-2 h-2 rounded-full ${PRIORITY_DOTS[node.priority] ?? "bg-gray-500"}`}
              />
            )}
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              {node.priority ?? TYPE_LABELS[node.entityType]}
            </span>
          </div>
          {isDone && (
            <svg
              className="w-3.5 h-3.5 text-emerald-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <p className="text-sm text-gray-100 font-medium leading-tight truncate">
          {node.label}
        </p>

        {/* Status + metadata */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] text-gray-500">
            {node.status.replace(/_/g, " ")}
          </span>
          {node.metadata?.dueDate ? (
            <>
              <span className="text-[10px] text-gray-700">&middot;</span>
              <span className="text-[10px] text-gray-500">
                {new Date(node.metadata.dueDate as string).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" }
                )}
              </span>
            </>
          ) : null}
          {node.entityType === "ORDER" && node.metadata?.totalCents ? (
            <span className="text-[10px] text-emerald-400 font-medium ml-auto">
              ${(Number(node.metadata.totalCents) / 100).toFixed(0)}
            </span>
          ) : null}
          {node.entityType === "PROJECT" && node.metadata?.phaseCount ? (
            <span className="text-[10px] text-gray-500 ml-auto">
              {Number(node.metadata.completedPhases)}/
              {Number(node.metadata.phaseCount)} phases
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
