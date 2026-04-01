"use client";

interface Props {
  nodeCount: number;
  edgeCount: number;
  filterStatus: string;
  filterType: string;
  onFilterStatusChange: (v: string) => void;
  onFilterTypeChange: (v: string) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export default function MissionControlHeader({
  nodeCount,
  edgeCount,
  filterStatus,
  filterType,
  onFilterStatusChange,
  onFilterTypeChange,
  onRegenerate,
  regenerating,
}: Props) {
  return (
    <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
            />
          </svg>
          <h1 className="text-sm font-semibold text-gray-900">
            Mission Control
          </h1>
        </div>
        <span className="text-xs text-gray-400">
          {nodeCount} nodes &middot; {edgeCount} connections
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
          className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
          <option value="ACTIVE">Active</option>
        </select>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => onFilterTypeChange(e.target.value)}
          className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All types</option>
          <option value="TASK">Tasks</option>
          <option value="PROJECT">Projects</option>
          <option value="BRIEF">Briefs</option>
          <option value="ORDER">Orders</option>
        </select>

        {/* Regenerate */}
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-50 transition-colors"
        >
          {regenerating ? "Regenerating..." : "Regenerate"}
        </button>
      </div>
    </div>
  );
}
