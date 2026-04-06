"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/shared/StatusBadge";
import PhasesTimeline from "@/components/shared/PhasesTimeline";
import { openChatWithContext } from "@/lib/chat-event";
import { createClient } from "@/lib/supabase/client";

interface Artifact {
  id: string;
  name: string;
  type: string;
  url?: string;
  status: string;
  createdAt: string;
}

interface BriefPhase {
  id: string;
  name: string;
  status: string;
  order: number;
}

interface BriefDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  clientName?: string;
  client?: { name: string };
  phases: BriefPhase[];
  artifacts: Artifact[];
  reviewStatus?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const ARTIFACT_TYPE_STYLES: Record<string, string> = {
  image: "bg-purple-50 text-purple-600",
  document: "bg-blue-50 text-blue-600",
  video: "bg-pink-50 text-pink-600",
  audio: "bg-amber-50 text-amber-600",
};

async function getAuthHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

function LoadingSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-4 w-16 bg-[var(--bg-surface)] rounded mb-4" />
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-7 w-48 bg-[var(--bg-surface)] rounded" />
            <div className="h-5 w-20 bg-[var(--bg-surface)] rounded-full" />
          </div>
          <div className="h-4 w-32 bg-[var(--bg-surface)] rounded mt-2" />
          <div className="h-4 w-64 bg-[var(--bg-surface)] rounded mt-2" />
        </div>
        <div className="h-9 w-28 bg-[var(--bg-surface)] rounded-lg" />
      </div>
      <div className="mb-8">
        <div className="h-4 w-16 bg-[var(--bg-surface)] rounded mb-3" />
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 bg-[var(--bg-surface)] rounded-full" />
                <div className="h-3 w-16 bg-[var(--bg-surface)] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="h-4 w-20 bg-[var(--bg-surface)] rounded mb-3" />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-5 py-3 flex items-center justify-between mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="h-4 w-14 bg-[var(--bg-surface)] rounded" />
              <div className="h-4 w-36 bg-[var(--bg-surface)] rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 bg-[var(--bg-surface)] rounded-full" />
              <div className="h-3 w-16 bg-[var(--bg-surface)] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BriefDetailPage({
  params,
}: {
  params: Promise<{ briefId: string }>;
}) {
  const { briefId } = use(params);
  const router = useRouter();
  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/v1/briefs/${briefId}`, { headers });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          setError(`Failed to load brief (${res.status})`);
          return;
        }
        const data = await res.json();
        if (!data || !data.id) {
          setNotFound(true);
          return;
        }
        setBrief(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [briefId]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (notFound) {
    return (
      <div className="p-6">
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
            Brief not found
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            This brief may have been deleted or you don&apos;t have access.
          </p>
          <button
            onClick={() => router.push("/briefs")}
            className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            Back to Briefs
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-red-200 rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-red-700 mb-1">
            Error loading brief
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">{error}</p>
          <button
            onClick={() => router.push("/briefs")}
            className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            Back to Briefs
          </button>
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const sortedPhases = [...brief.phases].sort(
    (a, b) => a.order - b.order
  );

  const clientDisplay = brief.clientName || brief.client?.name;

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/briefs")}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors mb-4"
      >
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
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Briefs
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {brief.title}
            </h1>
            <StatusBadge status={brief.status} />
          </div>
          {clientDisplay && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Client: {clientDisplay}
            </p>
          )}
          {brief.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {brief.description}
            </p>
          )}
        </div>
        <button
          onClick={() =>
            openChatWithContext(
              `Give me a summary of the brief "${brief.title}" including phase progress and artifact status`
            )
          }
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          Ask Agent
        </button>
      </div>

      {/* Phases Timeline */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Phases</h2>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
          <PhasesTimeline phases={sortedPhases} />
        </div>
      </div>

      {/* Artifacts */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Artifacts
          <span className="ml-2 text-xs font-normal text-[var(--text-tertiary)]">
            {brief.artifacts.length} file
            {brief.artifacts.length !== 1 ? "s" : ""}
          </span>
        </h2>
        {brief.artifacts.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-6 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              No artifacts uploaded yet.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
            {brief.artifacts.map((artifact) => {
              const typeBg =
                ARTIFACT_TYPE_STYLES[artifact.type?.toLowerCase()] ??
                "bg-[var(--bg-base)] text-[var(--text-secondary)]";
              return (
                <div
                  key={artifact.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded ${typeBg}`}
                    >
                      {artifact.type}
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {artifact.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={artifact.status} />
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {new Date(artifact.createdAt).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </ModuleLayoutShell>
  );
}
