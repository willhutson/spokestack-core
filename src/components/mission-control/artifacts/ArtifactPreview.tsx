"use client";

import { useState } from "react";
import { ARTIFACT_CONFIG } from "@/lib/mission-control/constants";
import type { ArtifactType } from "@/lib/mission-control/types";
import { cn } from "@/lib/utils";

interface ArtifactPreviewProps {
  artifact: {
    id: string;
    type: string;
    title: string;
    data: unknown;
    version?: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asRecord(data: unknown): Record<string, unknown> | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

function asArray(data: unknown): unknown[] | null {
  return Array.isArray(data) ? data : null;
}

function asString(val: unknown): string {
  if (typeof val === "string") return val;
  if (val == null) return "";
  return String(val);
}

// ---------------------------------------------------------------------------
// Type-specific renderers
// ---------------------------------------------------------------------------

function DocumentRenderer({ data }: { data: unknown }) {
  const record = asRecord(data);

  if (record?.sections && Array.isArray(record.sections)) {
    return (
      <div className="space-y-4">
        {record.sections.map((section: unknown, i: number) => {
          const s = asRecord(section);
          return (
            <div key={i}>
              {!!s?.heading && (
                <h3 className="mb-1 text-sm font-semibold text-gray-800">
                  {asString(s.heading)}
                </h3>
              )}
              {!!s?.title && !s?.heading && (
                <h3 className="mb-1 text-sm font-semibold text-gray-800">
                  {asString(s.title)}
                </h3>
              )}
              <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                {asString(s?.body ?? s?.content ?? s?.text ?? "")}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // Plain text / string data
  const text = typeof data === "string" ? data : record?.body ?? record?.content ?? record?.text;
  if (text) {
    return (
      <div className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
        {asString(text)}
      </div>
    );
  }

  return <FallbackRenderer data={data} />;
}

function TableRenderer({ data }: { data: unknown }) {
  const record = asRecord(data);
  let columns: string[] = [];
  let rows: Record<string, unknown>[] = [];

  if (record?.columns && record?.rows) {
    columns = (record.columns as unknown[]).map(asString);
    rows = record.rows as Record<string, unknown>[];
  } else {
    const arr = asArray(data) ?? (record?.data ? asArray(record.data) : null);
    if (arr && arr.length > 0) {
      const first = asRecord(arr[0]);
      if (first) {
        columns = Object.keys(first);
        rows = arr as Record<string, unknown>[];
      }
    }
  }

  if (columns.length === 0) return <FallbackRenderer data={data} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn("border-b border-gray-100", i % 2 === 1 && "bg-gray-50")}
            >
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 text-gray-700">
                  {asString(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  done: "bg-green-100 text-green-700",
  complete: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  "in-progress": "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  active: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  upcoming: "bg-violet-100 text-violet-700",
  overdue: "bg-red-100 text-red-700",
};

function TimelineRenderer({ data }: { data: unknown }) {
  const record = asRecord(data);
  const items = asArray(data) ?? (record?.items ? asArray(record.items) : null)
    ?? (record?.events ? asArray(record.events) : null);

  if (!items || items.length === 0) return <FallbackRenderer data={data} />;

  return (
    <div className="relative space-y-0">
      {items.map((item: unknown, i: number) => {
        const entry = asRecord(item);
        if (!entry) return null;
        const status = asString(entry.status ?? "").toLowerCase();
        const statusClass = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";

        return (
          <div key={i} className="relative flex gap-4 pb-6">
            {/* Vertical line */}
            {i < items.length - 1 && (
              <div className="absolute left-[9px] top-5 h-full w-px bg-gray-200" />
            )}
            {/* Dot */}
            <div className="relative z-10 mt-1 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-indigo-400 bg-white" />
            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {!!entry.date && (
                  <span className="text-xs font-medium text-gray-400">
                    {asString(entry.date)}
                  </span>
                )}
                {status && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusClass)}>
                    {status}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-800">
                {asString(entry.title ?? entry.name ?? entry.label ?? "")}
              </p>
              {!!entry.description && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {asString(entry.description)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeckRenderer({ data }: { data: unknown }) {
  const record = asRecord(data);
  const slides = asArray(data) ?? (record?.slides ? asArray(record.slides) : null);

  if (!slides || slides.length === 0) return <FallbackRenderer data={data} />;

  return (
    <div className="space-y-4">
      {slides.map((slide: unknown, i: number) => {
        const s = asRecord(slide);
        if (!s) return null;
        const bullets = asArray(s.bullets ?? s.points ?? s.items) ?? [];

        return (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-100 text-xs font-bold text-indigo-600">
                {i + 1}
              </span>
              <h4 className="text-sm font-semibold text-gray-800">
                {asString(s.title ?? s.heading ?? `Slide ${i + 1}`)}
              </h4>
            </div>
            {bullets.length > 0 && (
              <ul className="ml-8 list-disc space-y-1">
                {bullets.map((b: unknown, j: number) => (
                  <li key={j} className="text-xs text-gray-600">
                    {asString(b)}
                  </li>
                ))}
              </ul>
            )}
            {!!s.notes && (
              <p className="mt-2 ml-8 text-xs italic text-gray-400">
                {asString(s.notes)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MoodboardRenderer({ data }: { data: unknown }) {
  const record = asRecord(data);
  const items = asArray(data) ?? (record?.items ? asArray(record.items) : null)
    ?? (record?.images ? asArray(record.images) : null);

  if (!items || items.length === 0) return <FallbackRenderer data={data} />;

  const palette = [
    "bg-rose-100", "bg-sky-100", "bg-amber-100", "bg-emerald-100",
    "bg-violet-100", "bg-pink-100", "bg-teal-100", "bg-orange-100",
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item: unknown, i: number) => {
        const entry = asRecord(item);
        const label = entry
          ? asString(entry.label ?? entry.title ?? entry.name ?? entry.description ?? `Item ${i + 1}`)
          : asString(item);

        return (
          <div
            key={i}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg p-3 text-center",
              palette[i % palette.length],
            )}
          >
            <span className="text-xs font-medium text-gray-700">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function VideoScriptRenderer({ data }: { data: unknown }) {
  const record = asRecord(data);
  const scenes = asArray(data) ?? (record?.scenes ? asArray(record.scenes) : null);

  if (!scenes || scenes.length === 0) return <FallbackRenderer data={data} />;

  return (
    <div className="space-y-4">
      {scenes.map((scene: unknown, i: number) => {
        const s = asRecord(scene);
        if (!s) return null;

        return (
          <div key={i} className="rounded-lg border-l-4 border-red-300 bg-gray-50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-bold text-red-500">SCENE {i + 1}</span>
              {!!s.setting && (
                <span className="text-xs text-gray-400">
                  -- {asString(s.setting)}
                </span>
              )}
            </div>
            {!!s.action && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-500">Action: </span>
                {asString(s.action)}
              </p>
            )}
            {!!s.dialogue && (
              <p className="mt-1 text-sm italic text-gray-600">
                <span className="font-semibold not-italic text-gray-500">Dialogue: </span>
                &ldquo;{asString(s.dialogue)}&rdquo;
              </p>
            )}
            {!!s.voiceover && (
              <p className="mt-1 text-sm italic text-gray-600">
                <span className="font-semibold not-italic text-gray-500">VO: </span>
                {asString(s.voiceover)}
              </p>
            )}
            {!!s.duration && (
              <p className="mt-1 text-[10px] text-gray-400">
                Duration: {asString(s.duration)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StitchDesignRenderer({ data }: { data: unknown }) {
  return <JsonTreeNode value={data} label="root" defaultOpen />;
}

function JsonTreeNode({
  label,
  value,
  defaultOpen = false,
}: {
  label: string;
  value: unknown;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (value === null || value === undefined) {
    return (
      <div className="ml-4 text-xs">
        <span className="text-gray-500">{label}: </span>
        <span className="text-gray-400">null</span>
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Array.isArray(value)
      ? value.map((v, i) => [String(i), v] as const)
      : Object.entries(value as Record<string, unknown>);

    return (
      <div className="ml-4">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
        >
          <span className="w-3 text-center text-[10px]">{open ? "\u25BC" : "\u25B6"}</span>
          <span className="font-medium">{label}</span>
          <span className="text-gray-400">
            {Array.isArray(value) ? `[${value.length}]` : `{${entries.length}}`}
          </span>
        </button>
        {open && (
          <div className="border-l border-gray-200 pl-1">
            {entries.map(([k, v]) => (
              <JsonTreeNode key={k} label={k} value={v} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ml-4 text-xs">
      <span className="text-gray-500">{label}: </span>
      <span
        className={cn(
          typeof value === "string" ? "text-green-600" : "text-blue-600",
        )}
      >
        {typeof value === "string" ? `"${value}"` : String(value)}
      </span>
    </div>
  );
}

function FallbackRenderer({ data }: { data: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Renderer map
// ---------------------------------------------------------------------------

const RENDERERS: Record<string, React.ComponentType<{ data: unknown }>> = {
  document: DocumentRenderer,
  brief: DocumentRenderer,
  contract: DocumentRenderer,
  table: TableRenderer,
  report: TableRenderer,
  calendar: TimelineRenderer,
  timeline: TimelineRenderer,
  deck: DeckRenderer,
  moodboard: MoodboardRenderer,
  video_script: VideoScriptRenderer,
  stitch_design: StitchDesignRenderer,
};

// ---------------------------------------------------------------------------
// ArtifactPreview
// ---------------------------------------------------------------------------

export function ArtifactPreview({ artifact }: ArtifactPreviewProps) {
  const config = ARTIFACT_CONFIG[artifact.type as ArtifactType] ?? {
    label: artifact.type,
    icon: "📦",
    color: "text-gray-500",
  };

  const Renderer = RENDERERS[artifact.type] ?? FallbackRenderer;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="text-lg">{config.icon}</span>
        <span className={cn("text-xs font-semibold uppercase tracking-wider", config.color)}>
          {config.label}
        </span>
        {artifact.version != null && (
          <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            v{artifact.version}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-bold text-gray-900">{artifact.title}</h2>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        <Renderer data={artifact.data} />
      </div>
    </div>
  );
}
