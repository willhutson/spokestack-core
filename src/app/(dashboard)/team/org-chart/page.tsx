"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { TeamNav } from "../TeamNav";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  role: string;
  user?: { id: string; email: string; name?: string };
  team?: { id: string; name: string };
}

interface Department {
  id: string;
  value: { name?: string; head?: string; description?: string };
}

interface OrgNode {
  name: string;
  title: string;
  initials: string;
  children: OrgNode[];
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name[0].toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

function NodeCard({ node, depth }: { node: OrgNode; depth: number }) {
  return (
    <div className={cn("ml-0", depth > 0 && "ml-8")}>
      <div className="flex items-center gap-3 py-2">
        {depth > 0 && (
          <div className="flex items-center">
            <div className="w-6 border-t border-[var(--border-strong)]" />
          </div>
        )}
        <div className="flex items-center gap-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl px-4 py-3 hover:shadow-sm transition-shadow">
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold",
            depth === 0 ? "bg-amber-100 text-amber-700" : depth === 1 ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
          )}>
            {node.initials}
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">{node.name}</div>
            <div className="text-xs text-[var(--text-secondary)]">{node.title}</div>
          </div>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="border-l border-[var(--border)] ml-4">
          {node.children.map((child, i) => (
            <NodeCard key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

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

  const orgTree = useMemo((): OrgNode => {
    // Find owner as root
    const owner = members.find((m) => m.role === "OWNER");
    const ownerName = owner?.user?.name ?? owner?.user?.email ?? "CEO";

    // Group members by team/department
    const groups: Record<string, Member[]> = {};
    members.forEach((m) => {
      if (m.role === "OWNER") return;
      const dept = m.team?.name ?? "General";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(m);
    });

    // Build department-level nodes from ContextEntry or from member groups
    const deptNames = new Set<string>();
    departments.forEach((d) => { if (d.value.name) deptNames.add(d.value.name); });
    Object.keys(groups).forEach((g) => deptNames.add(g));

    const deptNodes: OrgNode[] = Array.from(deptNames).map((deptName) => {
      const dept = departments.find((d) => d.value.name === deptName);
      const deptMembers = groups[deptName] ?? [];
      return {
        name: dept?.value.head ?? deptName,
        title: `Head of ${deptName}`,
        initials: getInitials(dept?.value.head ?? deptName),
        children: deptMembers.map((m) => ({
          name: m.user?.name ?? m.user?.email ?? "Unknown",
          title: m.role,
          initials: getInitials(m.user?.name, m.user?.email),
          children: [],
        })),
      };
    });

    return {
      name: ownerName,
      title: "Owner",
      initials: getInitials(owner?.user?.name, owner?.user?.email),
      children: deptNodes,
    };
  }, [members, departments]);

  return (
    <ModuleLayoutShell moduleType="DELEGATION">
      <div className="p-6">
        <TeamNav />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Org Chart</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Organizational structure and reporting lines</p>
        </div>

        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-tertiary)]">Loading...</div>
        ) : members.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No team members</h3>
            <p className="text-xs text-[var(--text-secondary)]">Add team members to see the org chart.</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 overflow-x-auto">
            <NodeCard node={orgTree} depth={0} />
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
