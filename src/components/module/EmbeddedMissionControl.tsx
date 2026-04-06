"use client";

import { useState } from "react";
import { X, Download, Copy, Check } from "lucide-react";
import { AgentChat } from "@/components/agents/AgentChat";
import { cn } from "@/lib/utils";
import { ARTIFACT_CONFIG } from "@/lib/mission-control/constants";
import type { ArtifactType } from "@/lib/mission-control/types";

interface Artifact {
  id: string;
  type: string;
  title: string;
  data: unknown;
}

interface EmbeddedMissionControlProps {
  isOpen: boolean;
  onClose: () => void;
  activeAgent: string | null;
  onSwitchAgent: (agentType: string) => void;
  availableAgents: string[];
}

export function EmbeddedMissionControl({
  isOpen,
  onClose,
  activeAgent,
  onSwitchAgent,
  availableAgents,
}: EmbeddedMissionControlProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [copied, setCopied] = useState(false);

  function handleDownload(artifact: Artifact) {
    const blob = new Blob(
      [JSON.stringify(artifact.data, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy(artifact: Artifact) {
    navigator.clipboard.writeText(JSON.stringify(artifact.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "border-l bg-background flex overflow-hidden transition-all duration-300 ease-in-out shrink-0 h-full",
        isOpen ? (selectedArtifact ? "w-[800px]" : "w-[400px]") : "w-0"
      )}
      aria-hidden={!isOpen}
    >
      {isOpen && activeAgent && (
        <>
          {/* Chat column */}
          <div className="w-[400px] flex flex-col shrink-0 border-r">
            <div className="h-12 flex items-center justify-between px-4 border-b shrink-0">
              {availableAgents.length > 1 ? (
                <select
                  value={activeAgent}
                  onChange={(e) => onSwitchAgent(e.target.value)}
                  className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
                >
                  {availableAgents.map((a) => (
                    <option key={a} value={a}>
                      {a.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-medium">Agent Chat</span>
              )}
              <div className="flex items-center gap-1">
                <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
                  ⌘J
                </kbd>
                <button
                  onClick={onClose}
                  className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <AgentChat
                agentType={activeAgent}
                onArtifactClick={setSelectedArtifact}
                onAgentSwitch={onSwitchAgent}
                className="h-full border-0 rounded-none"
              />
            </div>
          </div>

          {/* Artifact preview column */}
          {selectedArtifact && (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Artifact header */}
              <div className="h-12 flex items-center justify-between px-4 border-b shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">
                    {ARTIFACT_CONFIG[selectedArtifact.type as ArtifactType]?.icon ?? "📄"}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {selectedArtifact.title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
                    {ARTIFACT_CONFIG[selectedArtifact.type as ArtifactType]?.label ?? selectedArtifact.type}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDownload(selectedArtifact)}
                    className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                    title="Download JSON"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleCopy(selectedArtifact)}
                    className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedArtifact(null)}
                    className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Artifact content */}
              <div className="flex-1 overflow-y-auto p-4">
                <ArtifactRenderer artifact={selectedArtifact} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Inline artifact renderer — handles all artifact types
function ArtifactRenderer({ artifact }: { artifact: Artifact }) {
  const data = artifact.data as Record<string, unknown>;

  // Table / Report
  if (artifact.type === "table" || artifact.type === "report") {
    const rows = Array.isArray(data) ? data : (data.rows as Record<string, unknown>[]) ?? [];
    const columns = (data.columns as string[]) ?? (rows.length > 0 ? Object.keys(rows[0]) : []);
    if (rows.length === 0) return <EmptyArtifact />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th key={col} className="text-left px-3 py-2 font-medium text-gray-700 bg-gray-50">
                  {String(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-gray-600 border-b border-gray-100">
                    {String((row as Record<string, unknown>)[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Calendar / Timeline
  if (artifact.type === "calendar" || artifact.type === "timeline") {
    const items = Array.isArray(data) ? data : (data.entries as Record<string, unknown>[]) ?? (data.items as Record<string, unknown>[]) ?? [];
    if (items.length === 0) return <EmptyArtifact />;
    return (
      <div className="space-y-3">
        {items.map((item, i) => {
          const it = item as Record<string, unknown>;
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1.5" />
                {i < items.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
              </div>
              <div className="pb-4">
                <p className="text-xs text-gray-400">{String(it.date ?? it.time ?? it.startAt ?? "")}</p>
                <p className="text-sm font-medium text-gray-900">{String(it.title ?? it.name ?? "")}</p>
                {(it.description as string) && <p className="text-xs text-gray-500 mt-0.5">{String(it.description)}</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Deck
  if (artifact.type === "deck") {
    const slides = Array.isArray(data) ? data : (data.slides as Record<string, unknown>[]) ?? [];
    if (slides.length === 0) return <EmptyArtifact />;
    return (
      <div className="space-y-4">
        {slides.map((slide, i) => {
          const s = slide as Record<string, unknown>;
          return (
            <div key={i} className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-400">Slide {i + 1}</span>
              </div>
              <h4 className="text-sm font-semibold text-gray-900">{String(s.title ?? "")}</h4>
              {(s.body as string) && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{String(s.body)}</p>}
              {Array.isArray(s.bullets) && (
                <ul className="list-disc list-inside text-xs text-gray-600 mt-1 space-y-0.5">
                  {(s.bullets as string[]).map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Document / Brief / Contract / Video Script
  if (["document", "brief", "contract", "video_script"].includes(artifact.type)) {
    const content = typeof data === "string" ? data : (data.content as string) ?? (data.body as string) ?? "";
    const sections = (data.sections as Record<string, unknown>[]) ?? [];

    return (
      <div className="prose prose-sm max-w-none">
        {content && <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>}
        {sections.map((section, i) => {
          const sec = section as Record<string, unknown>;
          return (
            <div key={i} className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">{String(sec.title ?? sec.heading ?? "")}</h3>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{String(sec.content ?? sec.body ?? "")}</p>
            </div>
          );
        })}
        {!content && sections.length === 0 && <JsonFallback data={data} />}
      </div>
    );
  }

  // Fallback: pretty JSON
  return <JsonFallback data={data} />;
}

function JsonFallback({ data }: { data: unknown }) {
  return (
    <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto text-gray-600 border">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function EmptyArtifact() {
  return (
    <div className="text-center py-8 text-sm text-gray-400">
      No data to display
    </div>
  );
}
