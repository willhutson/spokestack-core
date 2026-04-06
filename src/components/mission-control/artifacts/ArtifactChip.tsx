"use client";

import { ARTIFACT_CONFIG } from "@/lib/mission-control/constants";
import type { ArtifactType } from "@/lib/mission-control/types";
import { cn } from "@/lib/utils";

interface ArtifactChipProps {
  artifact: { id: string; type: string; title: string };
  onClick: () => void;
}

export function ArtifactChip({ artifact, onClick }: ArtifactChipProps) {
  const config = ARTIFACT_CONFIG[artifact.type as ArtifactType] ?? {
    label: artifact.type,
    icon: "📦",
    color: "text-[var(--text-secondary)]",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm transition-all",
        "hover:border-indigo-300 hover:bg-[var(--accent-subtle)] hover:shadow-md",
        "active:scale-[0.97]",
      )}
      title={`Open ${config.label}: ${artifact.title}`}
    >
      <span className="text-sm leading-none">{config.icon}</span>
      <span className="max-w-[180px] truncate">{artifact.title}</span>
    </button>
  );
}
