"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Brief {
  id: string;
  title: string;
  status: "draft" | "in_review" | "approved" | "active" | "completed";
  clientName?: string;
  artifactCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<Brief["status"], { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  in_review: { bg: "bg-yellow-100", text: "text-yellow-700", label: "In Review" },
  approved: { bg: "bg-blue-100", text: "text-blue-700", label: "Approved" },
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  completed: { bg: "bg-purple-100", text: "text-purple-700", label: "Completed" },
};

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/briefs");
        if (res.ok) {
          const data = await res.json();
          setBriefs(data.briefs ?? data ?? []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Brief
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading briefs...</div>
      ) : briefs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No briefs yet</h3>
          <p className="text-xs text-gray-500 mb-4">
            Create your first brief to start managing creative deliverables.
          </p>
          <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
            Create Brief
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Brief</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Artifacts</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {briefs.map((brief) => {
                const status = STATUS_STYLES[brief.status];
                return (
                  <tr key={brief.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/briefs/${brief.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                        {brief.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {brief.clientName || <span className="text-gray-400">--</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-600">{brief.artifactCount}</td>
                    <td className="px-5 py-4 text-right text-xs text-gray-500">
                      {new Date(brief.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
