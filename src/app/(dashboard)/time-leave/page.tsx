"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user?: { id: string; email: string; name?: string; avatarUrl?: string };
  team?: { id: string; name: string };
}

function getWeekDays(): { label: string; date: string }[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1));
  const days: { label: string; date: string }[] = [];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ label: labels[i], date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
  }
  return days;
}

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    OWNER: "bg-amber-100 text-amber-700",
    ADMIN: "bg-blue-100 text-blue-700",
    MEMBER: "bg-gray-100 text-gray-600",
    VIEWER: "bg-gray-100 text-gray-500",
  };
  return colors[role] ?? "bg-gray-100 text-gray-600";
}

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 p-4 border-b border-gray-100">
      <div className="w-10 h-10 bg-gray-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function TimeLeavePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const weekDays = getWeekDays();

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/members", { headers });
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members ?? []);
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
    <div className="p-6 h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time & Leave</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {members.length} team member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openChatWithContext("Help me log my hours or request leave.")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            Ask Agent
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            Invite Member
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Team Directory */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Team Directory</h2>
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-lg">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">No team members found.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-semibold text-indigo-600">
                    {(m.user?.name?.[0] ?? m.user?.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.user?.name ?? m.user?.email ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{m.user?.email}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(m.role)}`}>
                    {m.role}
                  </span>
                  {m.team && (
                    <span className="text-xs text-gray-400">{m.team.name}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    Joined {new Date(m.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Weekly Timesheet */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Weekly Timesheet</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-48">Member</th>
                  {weekDays.map((d) => (
                    <th key={d.label} className="text-center text-xs font-medium text-gray-500 px-2 py-3">
                      <div>{d.label}</div>
                      <div className="text-gray-400 font-normal">{d.date}</div>
                    </th>
                  ))}
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(loading ? [] : members.slice(0, 10)).map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-[12rem]">
                      {m.user?.name ?? m.user?.email ?? "Unknown"}
                    </td>
                    {weekDays.map((d) => (
                      <td key={d.label} className="text-center px-2 py-3">
                        <span className="text-xs text-gray-300">&mdash;</span>
                      </td>
                    ))}
                    <td className="text-center px-4 py-3 text-sm font-medium text-gray-400">0h</td>
                  </tr>
                ))}
                {!loading && members.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-sm text-gray-400">No members to display</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Leave Balance */}
        <section>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Leave Balances</p>
              <p className="text-sm text-amber-700 mt-0.5">Coming soon &mdash; track leave requests and balances.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
