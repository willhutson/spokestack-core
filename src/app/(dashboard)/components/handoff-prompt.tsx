"use client";

export interface HandoffEvent {
  type: "handoff";
  target_agent: string;
  context_summary: string;
  reason: string;
}

const AGENT_LABELS: Record<string, string> = {
  PROJECTS: "Projects",
  BRIEFS: "Briefs",
  ORDERS: "Orders",
  TASKS: "Tasks",
  ONBOARDING: "Onboarding",
  core_projects: "Projects",
  core_briefs: "Briefs",
  core_orders: "Orders",
  core_tasks: "Tasks",
  core_onboarding: "General",
};

interface Props {
  handoff: HandoffEvent;
  onSwitch: (handoff: HandoffEvent) => void;
  onDismiss: () => void;
}

export default function HandoffPrompt({
  handoff,
  onSwitch,
  onDismiss,
}: Props) {
  const targetLabel =
    AGENT_LABELS[handoff.target_agent] ?? handoff.target_agent;

  return (
    <div className="mx-4 mb-3 flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
      <div className="mt-0.5 flex-shrink-0">
        <svg
          className="h-4 w-4 text-indigo-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-indigo-800">
          <span className="font-medium">
            Switch to {targetLabel} Agent?
          </span>{" "}
          {handoff.reason}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onSwitch(handoff)}
          className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Switch
        </button>
        <button
          onClick={onDismiss}
          className="rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          Stay
        </button>
      </div>
    </div>
  );
}
