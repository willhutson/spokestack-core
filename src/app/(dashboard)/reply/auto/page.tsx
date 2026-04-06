"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { ReplyNav } from "../ReplyNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContextEntry {
  id: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AutoReplyPage() {
  const [rules, setRules] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState("all");
  const [response, setResponse] = useState("");
  const [active, setActive] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/reply/rules", { headers });
      if (res.ok) {
        const data = await res.json();
        setRules(data.entries ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate() {
    if (!keyword.trim() || !response.trim()) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/reply/rules", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, platform, response, active }),
      });
      if (res.ok) {
        setKeyword("");
        setPlatform("all");
        setResponse("");
        setActive(true);
        setShowForm(false);
        loadData();
      }
    } catch {
      /* silent */
    }
  }

  function handleToggle(id: string) {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, value: { ...r.value, active: !r.value.active } }
          : r
      )
    );
  }

  return (
    <ModuleLayoutShell moduleType="SOCIAL_PUBLISHING">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reply</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage auto-reply rules for incoming messages.
          </p>
        </div>

        <ReplyNav />

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Auto-Reply Rules
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            {showForm ? "Cancel" : "New Rule"}
          </button>
        </div>

        {/* New Rule Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Trigger Keyword
                </label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. pricing, hours, support"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Platforms</option>
                  <option value="twitter">Twitter</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Response Template
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write the auto-reply message..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Active
              </label>
              <button
                onClick={handleCreate}
                disabled={!keyword.trim() || !response.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Save Rule
              </button>
            </div>
          </div>
        )}

        {/* Rules List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
              >
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-64 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No auto-reply rules configured.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Trigger
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Platform
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Response Preview
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Hits
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">
                      {rule.key}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {(rule.value.platform as string) || "all"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate">
                      {(rule.value.response as string) || ""}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500">
                      {(rule.value.hitCount as number) ?? 0}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleToggle(rule.id)}
                        className={cn(
                          "w-10 h-5 rounded-full transition-colors relative",
                          rule.value.active ? "bg-indigo-600" : "bg-gray-300"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                            rule.value.active ? "left-5" : "left-0.5"
                          )}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
