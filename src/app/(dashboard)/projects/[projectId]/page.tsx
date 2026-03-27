"use client";

import { useState, useEffect, use } from "react";
import CanvasView from "../components/canvas-view";

interface Phase {
  id: string;
  name: string;
  status: "pending" | "active" | "completed";
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
  status: "active" | "completed" | "on_hold" | "draft";
  startDate?: string;
  endDate?: string;
  progress: number;
  phases: Phase[];
  milestones: Milestone[];
  canvas?: {
    nodes: { id: string; label: string; x: number; y: number; type?: string }[];
    edges: { from: string; to: string; label?: string }[];
  };
}

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "canvas">("overview");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}`);
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
        <div className="text-sm text-gray-400">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Project not found</h3>
          <p className="text-xs text-gray-500">This project may have been deleted or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  const PHASE_STYLES = {
    pending: "bg-gray-100 text-gray-600 border-gray-200",
    active: "bg-indigo-50 text-indigo-700 border-indigo-200",
    completed: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/projects" className="hover:text-indigo-600 transition-colors">Projects</a>
          <span>/</span>
          <span className="text-gray-900">{project.name}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        {project.description && (
          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("canvas")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "canvas"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Canvas
          </button>
        </nav>
      </div>

      {activeTab === "overview" ? (
        <div className="grid grid-cols-3 gap-6">
          {/* Phases */}
          <div className="col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Phases</h2>
            {project.phases.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-xs text-gray-500">No phases defined yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {project.phases
                  .sort((a, b) => a.order - b.order)
                  .map((phase) => (
                    <div
                      key={phase.id}
                      className={`border rounded-lg px-4 py-3 flex items-center justify-between ${PHASE_STYLES[phase.status]}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-400">{phase.order}</span>
                        <span className="text-sm font-medium">{phase.name}</span>
                      </div>
                      <span className="text-xs font-medium capitalize">{phase.status}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Milestones */}
            <h2 className="text-sm font-semibold text-gray-900 mb-3 mt-6">Milestones</h2>
            {project.milestones.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-xs text-gray-500">No milestones defined yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {project.milestones.map((ms) => (
                  <div
                    key={ms.id}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          ms.completed
                            ? "border-green-500 bg-green-500"
                            : "border-gray-300"
                        }`}
                      >
                        {ms.completed && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${ms.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
                        {ms.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(ms.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar info */}
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{project.status.replace("_", " ")}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</label>
                <div className="mt-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{project.progress}% complete</p>
                </div>
              </div>
              {project.startDate && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Start</label>
                  <p className="text-sm text-gray-900 mt-0.5">
                    {new Date(project.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              )}
              {project.endDate && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">End</label>
                  <p className="text-sm text-gray-900 mt-0.5">
                    {new Date(project.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <CanvasView
          nodes={project.canvas?.nodes ?? []}
          edges={project.canvas?.edges ?? []}
        />
      )}
    </div>
  );
}
