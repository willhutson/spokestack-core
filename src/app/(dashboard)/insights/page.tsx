"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import InsightsTimeline from "./components/insights-timeline";

interface InsightEntry {
  id: string;
  entryType: string;
  category: string;
  key: string;
  value: {
    title: string;
    body: string;
    sourceCategory: string;
    generatedAt: string;
    sourceEntryCount: number;
  };
  confidence: number;
  createdAt: string;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        loadInsights(session.access_token);
      }
    });
  }, []);

  async function loadInsights(accessToken: string) {
    try {
      const res = await fetch(
        "/api/v1/context?entryType=INSIGHT&category=synthesis.weekly",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      setInsights(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-80" />
          <div className="h-32 bg-gray-100 rounded mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">
          Weekly Insights
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Synthesized from your organization&apos;s recent activity across all
          modules.
        </p>
      </div>
      <InsightsTimeline
        insights={insights}
        token={token}
        onRefresh={() => token && loadInsights(token)}
      />
    </div>
  );
}
