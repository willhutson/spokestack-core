interface Phase {
  id: string;
  name: string;
  status: string;
}

export default function PhasesTimeline({ phases }: { phases: Phase[] }) {
  if (!phases || phases.length === 0) {
    return (
      <p className="text-sm text-[var(--text-tertiary)]">No phases defined.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0 min-w-max">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  phase.status === "COMPLETED"
                    ? "bg-emerald-500 text-white"
                    : phase.status === "ACTIVE" ||
                        phase.status === "IN_PROGRESS"
                      ? "bg-[var(--accent)] text-[var(--primary-foreground)]"
                      : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                }`}
              >
                {phase.status === "COMPLETED" ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-xs text-[var(--text-secondary)] mt-1 text-center max-w-[80px] truncate">
                {phase.name}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                {phase.status?.replace(/_/g, " ")}
              </span>
            </div>
            {index < phases.length - 1 && (
              <div
                className={`w-12 h-px mx-1 mb-8 ${
                  phase.status === "COMPLETED"
                    ? "bg-emerald-300"
                    : "bg-[var(--bg-surface)]"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
