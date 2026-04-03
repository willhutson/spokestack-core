"use client";

import { useState, useEffect, useCallback } from "react";
import { openChatWithContext } from "@/lib/chat-event";
import { getAuthHeaders } from "@/lib/client-auth";

interface Connection {
  id: string;
  provider: string;
  status: string;
  accountName?: string;
  createdAt?: string;
}

const SOCIAL_PROVIDERS = ["facebook", "linkedin", "instagram", "twitter", "tiktok"];

const PROVIDER_LABELS: Record<string, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  twitter: "X (Twitter)",
  tiktok: "TikTok",
};

const PROVIDER_COLORS: Record<string, string> = {
  facebook: "bg-blue-50 text-blue-700 border-blue-200",
  linkedin: "bg-sky-50 text-sky-700 border-sky-200",
  instagram: "bg-pink-50 text-pink-700 border-pink-200",
  twitter: "bg-gray-50 text-gray-700 border-gray-200",
  tiktok: "bg-gray-50 text-gray-800 border-gray-200",
};

function getDayLabels(): string[] {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

function getWeekDates(): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function SocialPublishingPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConnections = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/integrations", { headers });
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections ?? data.integrations ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const socialConnections = connections.filter((c) =>
    SOCIAL_PROVIDERS.includes(c.provider?.toLowerCase())
  );

  const connectedProviders = new Set(
    socialConnections.map((c) => c.provider?.toLowerCase())
  );

  const dayLabels = getDayLabels();
  const weekDates = getWeekDates();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Publishing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and publish across social channels.</p>
        </div>
        <button
          onClick={() => openChatWithContext("Connect a social account and help me schedule my first post.")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.314a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
          </svg>
          Connect Account
        </button>
      </div>

      {/* Connected accounts */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Connected Accounts</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : socialConnections.length === 0 && connectedProviders.size === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.75.75 0 01-1.006-.293 19.836 19.836 0 01-1.712-4.025m2.853-5.356c-.253-.962-.584-1.892-.985-2.783a1.125 1.125 0 01.463-1.511l.657-.38a.75.75 0 011.006.293 19.836 19.836 0 011.712 4.025M15.75 9h3.75m-3.75 3H21m-3.75 3h3.75" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No social accounts connected</h3>
            <p className="text-xs text-gray-500 mb-4">Connect a social account to start publishing.</p>
            <button
              onClick={() => openChatWithContext("Help me connect a social media account for publishing.")}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Connect Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOCIAL_PROVIDERS.map((provider) => {
              const conn = socialConnections.find(
                (c) => c.provider?.toLowerCase() === provider
              );
              const isConnected = !!conn;
              const colorClasses = PROVIDER_COLORS[provider] ?? "bg-gray-50 text-gray-700 border-gray-200";
              return (
                <div
                  key={provider}
                  className={`border rounded-xl p-4 ${isConnected ? colorClasses : "bg-white border-gray-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isConnected ? "" : "bg-gray-100 text-gray-400"}`}>
                        {PROVIDER_LABELS[provider]?.charAt(0) ?? provider.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{PROVIDER_LABELS[provider] ?? provider}</p>
                        {conn?.accountName && (
                          <p className="text-xs opacity-70">{conn.accountName}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isConnected
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Content calendar */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Content Calendar</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-gray-200">
            {dayLabels.map((day, i) => {
              const date = weekDates[i];
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={day} className="min-h-[120px]">
                  <div className={`px-3 py-2 border-b border-gray-200 ${isToday ? "bg-indigo-50" : "bg-gray-50"}`}>
                    <p className={`text-xs font-medium ${isToday ? "text-indigo-600" : "text-gray-500"}`}>
                      {day}
                    </p>
                    <p className={`text-sm font-semibold ${isToday ? "text-indigo-700" : "text-gray-900"}`}>
                      {date.getDate()}
                    </p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-gray-400 text-center mt-4">No posts</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
