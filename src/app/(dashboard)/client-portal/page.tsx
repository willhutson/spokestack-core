"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Client {
  id: string;
  name: string;
  email?: string;
  status?: string;
  createdAt: string;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function ClientPortalPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/clients", { headers });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  return (
    <ModuleLayoutShell moduleType="CLIENT_PORTAL">
    <div className="p-6 bg-white min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage portal access, submissions, and client approvals.</p>
        </div>
        <button
          onClick={() => openChatWithContext("Help me invite a new client to the portal.")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
          Invite Client
        </button>
      </div>

      {/* Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Portal Users" value={clients.length} />
          <MetricCard label="Active Clients" value={clients.filter((c) => c.status === "ACTIVE" || !c.status).length} />
          <MetricCard label="Pending Approvals" value={0} />
          <MetricCard label="Submissions" value={0} />
        </div>
      )}

      {/* Portal Users (from clients) */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Portal Users</h2>
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No portal users yet</h3>
            <p className="text-xs text-gray-500 mb-4">Invite clients to give them portal access for submissions and approvals.</p>
            <button
              onClick={() => openChatWithContext("Help me invite a new client to the portal.")}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Invite Client
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-semibold text-indigo-600">
                  {(client.name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                  {client.email && <p className="text-xs text-gray-500 truncate">{client.email}</p>}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${client.status === "ACTIVE" || !client.status ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {client.status ?? "ACTIVE"}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Portal Activity Feed */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Portal Activity</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No activity yet</h3>
          <p className="text-xs text-gray-500">Client portal activity will appear here as clients interact with your portal.</p>
        </div>
      </section>

      {/* Submission Approvals Placeholder */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Submission Approvals</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No pending approvals</h3>
          <p className="text-xs text-gray-500">Client submissions requiring your approval will appear here.</p>
        </div>
      </section>
    </div>
    </ModuleLayoutShell>
  );
}
