"use client";

import { cn } from "@/lib/utils";
import { ArtifactActions } from "./ArtifactActions";
import { ArtifactPreview } from "./ArtifactPreview";

interface ArtifactPanelProps {
  artifact: {
    id: string;
    type: string;
    title: string;
    data: unknown;
    version?: number;
  } | null;
  onClose: () => void;
}

export function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  return (
    <div
      className={cn(
        "relative flex h-full shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--bg-base)] transition-all duration-300",
        artifact ? "w-[480px]" : "w-0 border-l-0",
      )}
    >
      {artifact && (
        <>
          {/* Action bar */}
          <ArtifactActions artifact={artifact} onClose={onClose} />

          {/* Scrollable preview body */}
          <div className="flex-1 overflow-y-auto p-4">
            <ArtifactPreview artifact={artifact} />
          </div>
        </>
      )}
    </div>
  );
}
