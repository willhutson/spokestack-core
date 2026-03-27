"use client";

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "done";
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
}: {
  task: Task;
  onClick?: (task: Task) => void;
}) {
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div
      onClick={() => onClick?.(task)}
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    >
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
