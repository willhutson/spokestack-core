"use client";

import { useState } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { LmsNav } from "./LmsNav";

export default function LMSPage() {
  const [activeTab, setActiveTab] = useState<"courses" | "enrollments">("courses");

  return (
    <ModuleLayoutShell moduleType="LMS">
      <div className="p-6">
      <LmsNav />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">LMS</h1>
          <p className="text-sm text-[var(--text-secondary)]">Courses, training modules, and team skill development.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(["courses", "enrollments"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-sm text-[var(--text-secondary)]">Courses</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">0</p>
        </div>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-sm text-[var(--text-secondary)]">Enrollments</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">0</p>
        </div>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-sm text-[var(--text-secondary)]">Completion Rate</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">—</p>
        </div>
      </div>

      <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
        {activeTab === "courses" ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" /></svg>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-3">No courses created yet.</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-secondary)]">No enrollments yet. Create a course first.</p>
          </div>
        )}
      </div>
    </div>
    </ModuleLayoutShell>
  );
}
