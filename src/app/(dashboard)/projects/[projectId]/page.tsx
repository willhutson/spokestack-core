"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/shared/StatusBadge";
import PhasesTimeline from "@/components/shared/PhasesTimeline";
import { openChatWithContext } from "@/lib/chat-event";
import { createClient } from "@/lib/supabase/client";

interface Phase {
  id: string;
  name: string;
  status: string;
  order: number;
}

interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  completed: boolean;
  phaseId?: string;
}

interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  phases: Phase[];
  milestones: Milestone[];
}

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
      <div className="h-4 w-20 bg-[var(--bg-surface)] rounded mb-4" />
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-7 w-56 bg-[var(--bg-surface)] rounded" />
            <div className="h-5 w-20 bg-[var(--bg-surface)] rounded-full" />
          </div>
          <div className="h-4 w-72 bg-[var(--bg-surface)] rounded mt-2" />
          <div className="flex gap-4 mt-2">
            <div className="h-3 w-28 bg-[var(--bg-surface)] rounded" />
            <div className="h-3 w-28 bg-[var(--bg-surface)] rounded" />
          </div>
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
        <div className="h-4 w-24 bg-[var(--bg-surface)] rounded mb-3" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center justify-between mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-[var(--bg-surface)] rounded-full" />
              <div className="h-4 w-40 bg-[var(--bg-surface)] rounded" />
            </div>
            <div className="h-3 w-20 bg-[var(--bg-surface)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/v1/projects/${projectId}`, { headers });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          setError(`Failed to load project (${res.status})`);
          return;
        }
        const data = await res.json();
        if (!data || !data.id) {
          setNotFound(true);
          return;
        }
        setProject(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (notFound) {
    return (
      <div className="p-6">
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
            Project not found
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            This project may have been deleted or you don&apos;t have access.
          </p>
          <button
            onClick={() => router.push("/projects")}
            className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-[var(--bg-surface)] border border-red-200 rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-red-700 mb-1">
            Error loading project
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">{error}</p>
          <button
            onClick={() => router.push("/projects")}
            className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const sortedPhases = [...project.phases].sort(
    (a, b) => a.order - b.order
  );

  return (
    <ModuleLayoutShell moduleType="PROJECTS">
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/projects")}
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
        Projects
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mt-2">
            {project.startDate && (
              <span>
                Start:{" "}
                {new Date(project.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {project.endDate && (
              <span>
                End:{" "}
                {new Date(project.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() =>
            openChatWithContext(
              `Give me a detailed status update on project "${project.name}"`
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

      {/* Milestones */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Milestones
        </h2>
        {project.milestones.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg p-6 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              No milestones defined yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {project.milestones.map((ms) => {
              const isPast =
                !ms.completed && new Date(ms.dueDate) < new Date();
              return (
                <div
                  key={ms.id}
                  className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        ms.completed
                          ? "bg-emerald-500"
                          : isPast
                            ? "bg-red-400"
                            : "bg-[var(--bg-hover)]"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        ms.completed
                          ? "text-[var(--text-tertiary)] line-through"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {ms.name}
                    </span>
                  </div>
                  <span
                    className={`text-xs ${
                      isPast ? "text-red-500 font-medium" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {new Date(ms.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
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
