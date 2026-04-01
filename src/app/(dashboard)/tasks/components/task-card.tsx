"use client";

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  listName?: string;
}

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  urgent: "Urgent",
};

export default function TaskCard({
  task,
  onClick,
  onDelete,
}: {
  task: Task;
  onClick?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}) {
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div
      onClick={() => onClick?.(task)}
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group relative"
    >
      {/* Delete button on hover */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task);
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
          title="Delete task"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {task.title}
        </h4>
        <span
          className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_STYLES[task.priority]}`}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-medium">
              {task.assignee.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-600">{task.assignee}</span>
          </div>
        ) : (
          <span className="text-gray-400">Unassigned</span>
        )}

        {task.dueDate && (
          <span className={`${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      {task.listName && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-[10px] text-gray-400">{task.listName}</span>
        </div>
      )}
    </div>
  );
}
