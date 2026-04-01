"use client";

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

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/v1/projects/${projectId}`, {
          headers,
        });
        if (res.ok) {
          setProject(await res.json());
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-400">Loading project...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Project not found
          </h3>
          <p className="text-xs text-gray-500">
            This project may have been deleted or you don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  const sortedPhases = [...project.phases].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/projects")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-4"
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
            <h1 className="text-2xl font-bold text-gray-900">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="text-sm text-gray-500 mt-1">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
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
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Phases</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <PhasesTimeline phases={sortedPhases} />
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Milestones
        </h2>
        {project.milestones.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-xs text-gray-500">
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
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        ms.completed
                          ? "bg-emerald-500"
                          : isPast
                            ? "bg-red-400"
                            : "bg-gray-300"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        ms.completed
                          ? "text-gray-400 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {ms.name}
                    </span>
                  </div>
                  <span
                    className={`text-xs ${
                      isPast ? "text-red-500 font-medium" : "text-gray-500"
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
  );
}
