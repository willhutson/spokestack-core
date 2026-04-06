"use client";

interface StepProps {
  data: Record<string, unknown>;
  updateData: (updates: Record<string, unknown>) => void;
}

const MODULES = [
  { id: "tasks", name: "Task Management", description: "Track tasks and project deliverables", icon: "✅" },
  { id: "briefs", name: "Creative Briefs", description: "Generate and manage creative briefs", icon: "📝" },
  { id: "content", name: "Content Calendar", description: "Plan and schedule content", icon: "📅" },
  { id: "analytics", name: "Analytics", description: "Track performance metrics", icon: "📊" },
  { id: "media", name: "Media Buying", description: "Plan and track media placements", icon: "📺" },
  { id: "contracts", name: "Contracts", description: "Manage and analyze contracts", icon: "⚖️" },
  { id: "courses", name: "Course Builder", description: "Design training courses", icon: "🎓" },
  { id: "crm", name: "Client Management", description: "Manage client relationships", icon: "🤝" },
  { id: "resources", name: "Resource Planning", description: "Plan team capacity", icon: "👥" },
  { id: "marketplace", name: "Marketplace", description: "Access agent marketplace", icon: "🏪" },
];

export function Step2Modules({ data, updateData }: StepProps) {
  const selected = (data.modules as string[]) ?? [];

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((m) => m !== id)
      : [...selected, id];
    updateData({ modules: next });
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-[var(--text-primary)]">Modules</h2>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Choose the modules you want to activate. You can always add more later.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {MODULES.map((mod) => {
          const active = selected.includes(mod.id);
          return (
            <button
              key={mod.id}
              onClick={() => toggle(mod.id)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-base)]"
              }`}
            >
              <span className="text-2xl">{mod.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${active ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                  {mod.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{mod.description}</p>
              </div>
              <div className="ml-auto mt-0.5">
                <div
                  className={`h-5 w-5 rounded-md border-2 flex items-center justify-center ${
                    active ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border-strong)]"
                  }`}
                >
                  {active && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
