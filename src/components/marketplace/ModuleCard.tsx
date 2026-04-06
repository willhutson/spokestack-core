"use client";

export interface ModuleCardProps {
  moduleType: string;
  name: string;
  description: string;
  category: string;
  minTier: string;
  price: number | null;
  agentName: string;
  installed: boolean;
  installing?: boolean;
  onInstall: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  core: "bg-[var(--accent-subtle)] text-[var(--accent)]",
  marketing: "bg-green-100 text-green-700",
  ops: "bg-amber-100 text-amber-700",
  analytics: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
};

export default function ModuleCard({
  name,
  description,
  category,
  minTier,
  price,
  agentName,
  installed,
  installing,
  onInstall,
}: ModuleCardProps) {
  return (
    <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 flex flex-col h-full min-h-[200px]">
      {/* Header: name + category badge — fixed height */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {name}
          </h3>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
            {agentName}
          </p>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${CATEGORY_COLORS[category] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]"}`}
        >
          {category}
        </span>
      </div>

      {/* Description — clamped to 3 lines, fills available space */}
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-auto">
        {description}
      </p>

      {/* Footer: price + install — always pinned to bottom */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
        <div className="text-xs">
          {price ? (
            <span className="text-[var(--text-primary)] font-medium">
              ${(price / 100).toFixed(0)}/mo
            </span>
          ) : (
            <span className="text-[var(--accent)] font-medium">
              {minTier === "FREE" ? "Free" : `${minTier.charAt(0)}${minTier.slice(1).toLowerCase()}`}
            </span>
          )}
        </div>

        {installed ? (
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            Installed
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
            disabled={installing}
            className="text-[11px] font-medium text-[var(--primary-foreground)] bg-[var(--accent)] px-2.5 py-1 rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {installing ? "Installing..." : "Install"}
          </button>
        )}
      </div>
    </div>
  );
}
