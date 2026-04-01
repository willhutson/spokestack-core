"use client";

interface ActivityItem {
  id: string;
  agentType: string;
  action: string;
  content: string;
  toolCalls: string[];
  timestamp: string;
}

interface Props {
  activity: ActivityItem[];
}

const AGENT_COLORS: Record<string, string> = {
  TASKS: "bg-blue-500",
  PROJECTS: "bg-purple-500",
  BRIEFS: "bg-amber-500",
  ORDERS: "bg-emerald-500",
  ONBOARDING: "bg-indigo-500",
  MODULE: "bg-pink-500",
};

export default function ActivityFeed({ activity }: Props) {
  if (activity.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No recent agent activity.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activity.map((item) => {
        const dotColor = AGENT_COLORS[item.agentType] ?? "bg-gray-500";
        const time = new Date(item.timestamp).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        return (
          <div
            key={item.id}
            className="flex items-start gap-2.5 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <span
              className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-700 leading-relaxed">
                <span className="font-medium text-gray-900">
                  {item.agentType} Agent
                </span>{" "}
                {item.action}
              </p>
              {item.toolCalls.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {item.toolCalls.join(", ")}
                </p>
              )}
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
              {time}
            </span>
          </div>
        );
      })}
    </div>
  );
}
