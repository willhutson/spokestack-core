"use client";

import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Media Buying</h1>
          <p className="text-sm text-gray-500">Plan campaigns, allocate budgets, and track ad spend.</p>
        </div>
        <button
          onClick={() => openChatWithContext("Help me plan a media buying campaign")}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New Campaign
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-500">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-500">Total Spend (MTD)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">AED 0</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-500">Clients</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{clients.length}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Campaign Pipeline</h2>
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 mb-3">No campaigns yet.</p>
              <button
                onClick={() => openChatWithContext("Create a media buying campaign for one of my clients")}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Create your first campaign with the Media Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
