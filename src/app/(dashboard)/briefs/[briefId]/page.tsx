"use client";

import { useState, useEffect, use } from "react";

interface Artifact {
  id: string;
  name: string;
  type: string;
  url?: string;
  status: "pending" | "uploaded" | "approved" | "rejected";
  createdAt: string;
}

interface BriefPhase {
  id: string;
  name: string;
  status: "pending" | "active" | "completed";
  order: number;
}

interface BriefDetail {
  id: string;
  title: string;
  description?: string;
  status: "draft" | "in_review" | "approved" | "active" | "completed";
  clientName?: string;
  phases: BriefPhase[];
  artifacts: Artifact[];
  reviewStatus?: "pending" | "changes_requested" | "approved";
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const ARTIFACT_STATUS_STYLES: Record<Artifact["status"], { bg: string; text: string }> = {
  pending: { bg: "bg-gray-100", text: "text-gray-600" },
  uploaded: { bg: "bg-blue-100", text: "text-blue-700" },
  approved: { bg: "bg-green-100", text: "text-green-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
};

const REVIEW_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending Review" },
  changes_requested: { bg: "bg-orange-50", text: "text-orange-700", label: "Changes Requested" },
  approved: { bg: "bg-green-50", text: "text-green-700", label: "Approved" },
};

export default function BriefDetailPage({ params }: { params: Promise<{ briefId: string }> }) {
  const { briefId } = use(params);
  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/briefs/${briefId}`);
        if (res.ok) {
          setBrief(await res.json());
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [briefId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-400">Loading brief...</div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Brief not found</h3>
          <p className="text-xs text-gray-500">This brief may have been deleted or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  const reviewInfo = brief.reviewStatus ? REVIEW_STYLES[brief.reviewStatus] : null;

  return (
    <div className="p-6">
      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/briefs" className="hover:text-indigo-600 transition-colors">Briefs</a>
          <span>/</span>
          <span className="text-gray-900">{brief.title}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{brief.title}</h1>
            {brief.description && (
              <p className="text-sm text-gray-500 mt-1">{brief.description}</p>
            )}
            {brief.clientName && (
              <p className="text-xs text-gray-400 mt-1">Client: {brief.clientName}</p>
            )}
          </div>
          {reviewInfo && (
            <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${reviewInfo.bg} ${reviewInfo.text}`}>
              {reviewInfo.label}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Phases + Artifacts */}
        <div className="col-span-2 space-y-6">
          {/* Phases */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Phases</h2>
            {brief.phases.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-xs text-gray-500">No phases defined.</p>
              </div>
            ) : (
              <div className="flex gap-2">
                {brief.phases
                  .sort((a, b) => a.order - b.order)
                  .map((phase) => (
                    <div
                      key={phase.id}
                      className={`flex-1 rounded-lg border px-4 py-3 text-center ${
                        phase.status === "completed"
                          ? "bg-green-50 border-green-200"
                          : phase.status === "active"
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div
                        className={`text-xs font-medium mb-0.5 ${
                          phase.status === "completed"
                            ? "text-green-700"
                            : phase.status === "active"
                            ? "text-indigo-700"
                            : "text-gray-500"
                        }`}
                      >
                        Phase {phase.order}
                      </div>
                      <div className="text-sm font-medium text-gray-900">{phase.name}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Artifacts */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Artifacts
              <span className="ml-2 text-xs font-normal text-gray-400">
                {brief.artifacts.length} file{brief.artifacts.length !== 1 ? "s" : ""}
              </span>
            </h2>
            {brief.artifacts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-xs text-gray-500">No artifacts uploaded yet.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {brief.artifacts.map((artifact) => {
                    const statusStyle = ARTIFACT_STATUS_STYLES[artifact.status];
                    return (
                      <div key={artifact.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{artifact.name}</p>
                            <p className="text-xs text-gray-500">{artifact.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                            {artifact.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(artifact.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Review status sidebar */}
        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
              <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{brief.status.replace("_", " ")}</p>
            </div>
            {brief.clientName && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Client</label>
                <p className="text-sm text-gray-900 mt-0.5">{brief.clientName}</p>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</label>
              <p className="text-sm text-gray-900 mt-0.5">
                {new Date(brief.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</label>
              <p className="text-sm text-gray-900 mt-0.5">
                {new Date(brief.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            {brief.reviewNotes && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Review Notes</label>
                <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-lg p-3">{brief.reviewNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
