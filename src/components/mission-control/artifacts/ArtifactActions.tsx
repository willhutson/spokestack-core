"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ArtifactActionsProps {
  artifact: { id: string; type: string; title: string; data: unknown };
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function flattenToText(artifact: { title: string; type: string; data: unknown }): string {
  const lines: string[] = [`${artifact.title}`, `Type: ${artifact.type}`, ""];

  function walk(val: unknown, indent = 0) {
    const pad = "  ".repeat(indent);
    if (val === null || val === undefined) {
      lines.push(`${pad}(empty)`);
    } else if (typeof val === "string") {
      lines.push(`${pad}${val}`);
    } else if (typeof val === "number" || typeof val === "boolean") {
      lines.push(`${pad}${String(val)}`);
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        lines.push(`${pad}${i + 1}.`);
        walk(item, indent + 1);
      });
    } else if (typeof val === "object") {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        lines.push(`${pad}${k}:`);
        walk(v, indent + 1);
      }
    }
  }

  walk(artifact.data);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Action button
// ---------------------------------------------------------------------------

function ActionButton({
  label,
  icon,
  onClick,
  className,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
        className,
      )}
    >
      <span className="text-sm">{icon}</span>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ArtifactActions
// ---------------------------------------------------------------------------

export function ArtifactActions({ artifact, onClose }: ArtifactActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleDownloadJson = useCallback(() => {
    const json = JSON.stringify(artifact.data, null, 2);
    const safeName = artifact.title.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    downloadBlob(json, `${safeName}.json`, "application/json");
  }, [artifact]);

  const handleDownloadText = useCallback(() => {
    const text = flattenToText(artifact);
    const safeName = artifact.title.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    downloadBlob(text, `${safeName}.txt`, "text/plain");
  }, [artifact]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(artifact.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may not be available
    }
  }, [artifact]);

  const handleSendToModule = useCallback(() => {
    // Placeholder: open chat with context to save the artifact
    const msg = `Save this ${artifact.type} to my workspace`;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mc:open-chat", { detail: { message: msg, artifact } }),
      );
    }
  }, [artifact]);

  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <ActionButton icon="📥" label="JSON" onClick={handleDownloadJson} />
        <ActionButton icon="📄" label="Text" onClick={handleDownloadText} />
        <ActionButton
          icon={copied ? "✅" : "📋"}
          label={copied ? "Copied!" : "Copy"}
          onClick={handleCopy}
          className={copied ? "border-green-300 text-green-600" : undefined}
        />
        <ActionButton icon="📤" label="Send to Module" onClick={handleSendToModule} />
      </div>
      <button
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-secondary)]"
        aria-label="Close artifact panel"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
