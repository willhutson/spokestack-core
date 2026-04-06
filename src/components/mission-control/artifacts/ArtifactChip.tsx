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
    color: "text-gray-500",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm transition-all",
        "hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md",
        "active:scale-[0.97]",
      )}
      title={`Open ${config.label}: ${artifact.title}`}
    >
      <span className="text-sm leading-none">{config.icon}</span>
      <span className="max-w-[180px] truncate">{artifact.title}</span>
    </button>
  );
}
