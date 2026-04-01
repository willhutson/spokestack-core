interface Phase {
  id: string;
  name: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function PhasesTimeline({ phases }: { phases: Phase[] }) {
  if (!phases || phases.length === 0) {
    return <p className="text-sm text-gray-500">No phases defined.</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
      <div className="space-y-4">
        {phases.map((phase, i) => (
          <div key={phase.id} className="flex items-start gap-4">
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                phase.status === "COMPLETED"
                  ? "bg-green-500 border-green-500"
                  : phase.status === "ACTIVE" ||
                      phase.status === "IN_PROGRESS"
                    ? "bg-indigo-500 border-indigo-500"
                    : "bg-gray-800 border-white/20"
              }`}
            >
              <span className="text-xs font-bold text-white">
                {i + 1}
              </span>
            </div>
            <div className="pt-1">
              <p className="text-sm font-medium text-white">
                {phase.name}
              </p>
              {(phase.startDate || phase.endDate) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {phase.startDate && formatDate(phase.startDate)}
                  {phase.startDate && phase.endDate && " → "}
                  {phase.endDate && formatDate(phase.endDate)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
