"use client";

import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

interface Client { id: string; name: string; email?: string; }

export default function MediaBuyingPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/clients", { headers });
        if (res.ok) {
          const data = await res.json();
          setClients(data.clients ?? []);
        }
      } finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <ModuleLayoutShell moduleType="MEDIA_BUYING">
      <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Media Buying</h1>
          <p className="text-sm text-[var(--text-secondary)]">Plan campaigns, allocate budgets, and track ad spend.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-[var(--bg-surface)] rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-sm text-[var(--text-secondary)]">Active Campaigns</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">0</p>
            </div>
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-sm text-[var(--text-secondary)]">Total Spend (MTD)</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">AED 0</p>
            </div>
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-sm text-[var(--text-secondary)]">Clients</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{clients.length}</p>
            </div>
          </div>

          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Campaign Pipeline</h2>
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-tertiary)] mb-3">No campaigns yet.</p>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
