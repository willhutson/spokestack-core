"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { TeamNav } from "./TeamNav";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user?: { id: string; email: string; name?: string; avatarUrl?: string };
  team?: { id: string; name: string };
}

interface Department {
  id: string;
  value: { name?: string };
}

const ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    OWNER: "bg-amber-100 text-amber-700",
    ADMIN: "bg-blue-100 text-blue-700",
    MEMBER: "bg-gray-100 text-gray-600",
    VIEWER: "bg-gray-100 text-gray-500",
  };
  return colors[role] ?? "bg-gray-100 text-gray-600";
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name[0].toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export default function TeamDirectoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterRole, setFilterRole] = useState("All");

  // Invite form state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [memberRes, deptRes] = await Promise.all([
        fetch("/api/v1/members", { headers }),
        fetch("/api/v1/team/departments", { headers }),
      ]);
      if (memberRes.ok) {
        const data = await memberRes.json();
        setMembers(data.members ?? []);
      }
      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(data.entries ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const name = m.user?.name ?? m.user?.email ?? "";
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterRole !== "All" && m.role !== filterRole) return false;
      if (filterDept !== "All" && m.team?.name !== filterDept) return false;
      return true;
    });
  }, [members, search, filterRole, filterDept]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/context", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "STRUCTURED",
          category: "team_member",
          key: `team_member_${inviteEmail}`,
          value: { name: inviteName, email: inviteEmail, role: inviteRole, status: "invited", invitedAt: new Date().toISOString() },
        }),
      });
      setInviteName("");
      setInviteEmail("");
      setInviteRole("MEMBER");
      setShowInvite(false);
      await loadData();
    } catch { /* ignore */ } finally { setInviting(false); }
  }

  const deptNames = useMemo(() => {
    const names = new Set<string>();
    members.forEach((m) => { if (m.team?.name) names.add(m.team.name); });
    departments.forEach((d) => { if (d.value.name) names.add(d.value.name); });
    return Array.from(names);
  }, [members, departments]);

  return (
    <ModuleLayoutShell moduleType="DELEGATION">
      <div className="p-6">
        <TeamNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Directory</h1>
            <p className="text-sm text-gray-500 mt-0.5">{members.length} team member{members.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowInvite(!showInvite)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
            Invite Member
          </button>
        </div>

        {/* Invite Form */}
        {showInvite && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Invite Member</h2>
              <button onClick={() => setShowInvite(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
            <form onSubmit={handleInvite} className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required placeholder="email@example.com" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <button type="submit" disabled={inviting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {inviting ? "Inviting..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex items-center gap-3 mb-6">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="All">All Departments</option>
            {deptNames.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="All">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Team Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-gray-200 rounded-full" /><div className="flex-1"><div className="h-4 bg-gray-200 rounded w-2/3 mb-1" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">No team members found</h3>
            <p className="text-xs text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((m) => (
              <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-semibold text-indigo-600">
                    {getInitials(m.user?.name, m.user?.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{m.user?.name ?? m.user?.email ?? "Unknown"}</div>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", roleBadge(m.role))}>{m.role}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-16">Email</span>
                    <span className="text-xs text-gray-600 truncate">{m.user?.email ?? "--"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-16">Dept</span>
                    <span className="text-xs text-gray-600">{m.team?.name ?? "--"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-16">Joined</span>
                    <span className="text-xs text-gray-600">{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "--"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
