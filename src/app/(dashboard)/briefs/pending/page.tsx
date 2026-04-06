"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { BriefsNav } from "../BriefsNav";
import { getAuthHeaders } from "@/lib/client-auth";

interface Brief {
  id: string;
  title: string;
  description?: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function BriefsPendingPage() {
  const router = useRouter();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBriefs = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", { headers });
      if (res.ok) {
        const data = await res.json();
        const all: Brief[] = data.briefs ?? data ?? [];
        // Only DRAFT (needing resubmit) and IN_REVIEW (awaiting others)
        setBriefs(all.filter((b) => b.status === "DRAFT" || b.status === "IN_REVIEW"));
      }
    } catch {
      /* API not available */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const actionRequired = briefs.filter((b) => b.status === "DRAFT");
  const awaitingOthers = briefs.filter((b) => b.status === "IN_REVIEW");

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function renderSection(title: string, subtitle: string, items: Brief[], actionLabel: string) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
        <p className="text-xs text-gray-500 mb-4">{subtitle}</p>
        {items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-xs text-gray-500">Nothing here right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((brief) => {
              const meta = (brief.metadata ?? {}) as Record<string, unknown>;
              const briefType = meta.type as string | undefined;
              const dueDate = meta.dueDate as string | undefined;

              return (
                <div
                  key={brief.id}
                  onClick={() => router.push(`/briefs/${brief.id}`)}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{brief.title}</h3>
                        {briefType && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            {briefType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{actionLabel}</span>
                        {dueDate && <span>Due {formatDate(dueDate)}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      Updated {formatDate(brief.updatedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
      <div className="p-6">
        <BriefsNav />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pending</h1>
          <p className="text-sm text-gray-500 mt-1">
            Briefs that need your attention or are awaiting action from others
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Loading briefs...</div>
          </div>
        ) : (
          <>
            {renderSection(
              "Action Required",
              "These briefs need you to make changes and resubmit",
              actionRequired,
              "Needs resubmission"
            )}
            {renderSection(
              "Awaiting Others",
              "These briefs are in review and waiting on someone else",
              awaitingOthers,
              "In review"
            )}
          </>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
