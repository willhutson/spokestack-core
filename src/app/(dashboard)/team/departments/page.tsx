"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { TeamNav } from "../TeamNav";
import { cn } from "@/lib/utils";

interface Department {
  id: string;
  value: {
    name?: string;
    head?: string;
    description?: string;
    memberCount?: number;
  };
  createdAt: string;
}

interface Member {
  id: string;
  role: string;
  user?: { id: string; email: string; name?: string };
  team?: { id: string; name: string };
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // New department form
  const [showForm, setShowForm] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptHead, setDeptHead] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [deptRes, memberRes] = await Promise.all([
        fetch("/api/v1/team/departments", { headers }),
        fetch("/api/v1/members", { headers }),
      ]);
      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(data.entries ?? []);
      }
      if (memberRes.ok) {
        const data = await memberRes.json();
        setMembers(data.members ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName) return;
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/team/departments", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: deptName, head: deptHead, description: deptDesc }),
      });
      setDeptName("");
      setDeptHead("");
      setDeptDesc("");
      setShowForm(false);
      await loadData();
    } catch { /* ignore */ } finally { setSubmitting(false); }
  }

  const membersByDept = useMemo(() => {
    const map: Record<string, Member[]> = {};
    members.forEach((m) => {
      const dept = m.team?.name ?? "Unassigned";
      if (!map[dept]) map[dept] = [];
      map[dept].push(m);
    });
    return map;
  }, [members]);

  const selectedMembers = useMemo(() => {
    if (!selectedDept) return [];
    return membersByDept[selectedDept] ?? [];
  }, [selectedDept, membersByDept]);

  return (
    <ModuleLayoutShell moduleType="DELEGATION">
      <div className="p-6">
        <TeamNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage teams and departments</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
            New Department
          </button>
        </div>

        {/* New Department Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">New Department</h2>
              <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} required placeholder="Department name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Head</label>
                <input type="text" value={deptHead} onChange={(e) => setDeptHead(e.target.value)} placeholder="Department head" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} placeholder="Brief description" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="col-span-3">
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {submitting ? "Creating..." : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {/* Department List */}
            <div>
              {departments.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No departments</h3>
                  <p className="text-xs text-gray-500">Create your first department to organize your team.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {departments.map((dept) => {
                    const v = dept.value;
                    const count = membersByDept[v.name ?? ""]?.length ?? 0;
                    const isSelected = selectedDept === v.name;
                    return (
                      <button
                        key={dept.id}
                        onClick={() => setSelectedDept(isSelected ? null : (v.name ?? null))}
                        className={cn(
                          "w-full text-left bg-white border rounded-xl p-5 transition-all",
                          isSelected ? "border-indigo-300 ring-2 ring-indigo-100" : "border-gray-200 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-medium text-gray-900">{v.name ?? "Unnamed"}</h3>
                          <span className="text-xs text-gray-400">{count} member{count !== 1 ? "s" : ""}</span>
                        </div>
                        {v.head && <p className="text-xs text-gray-500 mb-1">Head: {v.head}</p>}
                        {v.description && <p className="text-xs text-gray-400">{v.description}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Department Members */}
            <div>
              {selectedDept ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Members in {selectedDept}</h3>
                  {selectedMembers.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                      <p className="text-xs text-gray-500">No members in this department.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
                            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Email</th>
                            <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedMembers.map((m) => (
                            <tr key={m.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{m.user?.name ?? "Unknown"}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{m.user?.email ?? "--"}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{m.role}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <p className="text-sm text-gray-500">Select a department to see its members.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
