"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

interface Project {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  description?: string;
  phaseCount?: number;
  milestoneCount?: number;
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

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadProjects() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/projects", { headers });
      if (res.ok) {
        const data = await res.json();
        const raw: Project[] = data.projects ?? data ?? [];
        const seen = new Set<string>();
        const unique = raw.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setProjects(unique);
      }
    } catch {
      // API not yet available
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) { setFormError("Project name is required."); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
          status: "PLANNING",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setFormError(body?.error || "Failed to create project");
        return;
      }
      setFormName(""); setFormDesc(""); setFormStartDate(""); setFormEndDate("");
      setShowForm(false);
      setLoading(true);
      loadProjects();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModuleLayoutShell moduleType="PROJECTS">
      <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage workflows, timelines, and milestones
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
        >
          {showForm ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateProject} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 mb-6 space-y-3">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Project name *" className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Description (optional)" className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
          </div>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-[var(--text-tertiary)]">Loading projects...</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-[var(--text-tertiary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
            No projects yet
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Create your first project to start managing workflows and
            timelines.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-base font-bold text-[var(--text-primary)] line-clamp-1">
                  {project.name}
                </h3>
                <StatusBadge status={project.status} />
              </div>

              {project.description && (
                <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                {project.startDate && project.endDate && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                    {new Date(project.startDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                    {" - "}
                    {new Date(project.endDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                )}
                {project.phaseCount !== undefined && (
                  <span>
                    {project.phaseCount} phase
                    {project.phaseCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
