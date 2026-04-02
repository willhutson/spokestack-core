"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/shared/StatusBadge";
import BriefCreateForm from "@/components/modules/briefs/BriefCreateForm";
import { openChatWithContext } from "@/lib/chat-event";
import { createClient } from "@/lib/supabase/client";

interface Brief {
  id: string;
  title: string;
  status: string;
  clientName?: string;
  phases?: { id: string; name: string; status: string }[];
  artifactCount?: number;
  createdAt: string;
  updatedAt: string;
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

export default function BriefsPage() {
  const router = useRouter();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadBriefs = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", { headers });
      if (res.ok) {
        const data = await res.json();
        setBriefs(data.briefs ?? data ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  function handleBriefCreated() {
    setShowCreateForm(false);
    setLoading(true);
    loadBriefs();
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Briefs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage creative briefs, artifacts, and client reviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              openChatWithContext(
                "Summarize my active briefs and their review status"
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
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            New Brief
          </button>
        </div>
      </div>

      {/* Create Brief Form */}
      {showCreateForm && (
        <BriefCreateForm
          onCreated={handleBriefCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-gray-400">Loading briefs...</div>
        </div>
      ) : briefs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            No briefs yet
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Create your first brief to start managing creative deliverables.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Create Brief
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {briefs.map((brief) => {
            const phases = brief.phases ?? [];
            const completedPhases = phases.filter(
              (p) =>
                p.status === "COMPLETED" || p.status === "completed"
            ).length;
            const totalPhases = phases.length;
            const progressPct =
              totalPhases > 0
                ? Math.round((completedPhases / totalPhases) * 100)
                : 0;

            return (
              <div
                key={brief.id}
                onClick={() => router.push(`/briefs/${brief.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-bold text-gray-900 line-clamp-1">
                    {brief.title}
                  </h3>
                  <StatusBadge status={brief.status} />
                </div>

                {brief.clientName && (
                  <p className="text-xs text-gray-500 mb-3">
                    {brief.clientName}
                  </p>
                )}

                {/* Phase progress bar */}
                {totalPhases > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Phase progress</span>
                      <span>
                        {completedPhases}/{totalPhases}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
