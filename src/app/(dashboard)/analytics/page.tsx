"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { AnalyticsNav } from "./AnalyticsNav";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Task { id: string; title: string; status: string; assigneeId?: string; createdAt: string; updatedAt: string }
interface Project { id: string; name: string; status: string; startDate?: string; endDate?: string; progress?: number; phaseCount?: number }
interface Brief { id: string; title: string; status: string }
interface Order { id: string; totalCents: number; status: string; createdAt: string }
interface Client { id: string; name: string }
interface Member { id: string; user?: { name?: string; email?: string }; role: string }
interface ActivityItem { id: string; type: string; title: string; status: string; updatedAt: string }

const aed = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 });

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700", ACTIVE: "bg-green-100 text-green-700", ON_HOLD: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-emerald-100 text-emerald-700", ARCHIVED: "bg-gray-100 text-[var(--text-secondary)]",
  TODO: "bg-gray-100 text-[var(--text-secondary)]", IN_PROGRESS: "bg-blue-100 text-blue-700", DONE: "bg-green-100 text-green-700",
  DRAFT: "bg-gray-100 text-[var(--text-secondary)]", IN_REVIEW: "bg-amber-100 text-amber-700",
};

const BRIEF_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9ca3af", ACTIVE: "#3b82f6", IN_REVIEW: "#f59e0b", COMPLETED: "#22c55e",
};

function MetricCard({ label, value, color, href }: { label: string; value: string | number; color?: string; href?: string }) {
  return (
    <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? "text-[var(--text-primary)]"}`}>{value}</p>
      {href && <a href={href} className="text-[10px] text-[var(--accent)] hover:underline mt-1 inline-block">View Details</a>}
    </div>
  );
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

export default function AnalyticsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [tR, pR, bR, oR, cR, mR, aR] = await Promise.all([
        fetch("/api/v1/tasks", { headers }), fetch("/api/v1/projects", { headers }),
        fetch("/api/v1/briefs", { headers }), fetch("/api/v1/orders", { headers }),
        fetch("/api/v1/clients", { headers }), fetch("/api/v1/members", { headers }),
        fetch("/api/v1/activity?limit=10", { headers }),
      ]);
      if (tR.ok) { const d = await tR.json(); setTasks(d.tasks ?? []); }
      if (pR.ok) { const d = await pR.json(); setProjects(d.projects ?? []); }
      if (bR.ok) { const d = await bR.json(); setBriefs(d.briefs ?? []); }
      if (oR.ok) { const d = await oR.json(); setOrders(d.orders ?? []); }
      if (cR.ok) { const d = await cR.json(); setClients(d.clients ?? []); }
      if (mR.ok) { const d = await mR.json(); setMembers(d.members ?? []); }
      if (aR.ok) { const d = await aR.json(); setActivity(d.activity ?? []); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalRevenue = orders.reduce((s, o) => s + (o.totalCents ?? 0), 0);
  const activeProjects = projects.filter(p => p.status === "ACTIVE").length;
  const briefsInReview = briefs.filter(b => b.status === "IN_REVIEW").length;
  const doneTasks = tasks.filter(t => t.status === "DONE");

  // Task velocity: last 4 weeks
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const velocity: { label: string; count: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const wk = currentWeek - i;
    const count = doneTasks.filter(t => {
      const d = new Date(t.updatedAt);
      return d.getFullYear() === now.getFullYear() && getWeekNumber(d) === wk;
    }).length;
    velocity.push({ label: `W${wk > 0 ? wk : wk + 52}`, count });
  }
  const maxVelocity = Math.max(...velocity.map(v => v.count), 1);

  // Revenue by month: last 6 months
  const revenueByMonth: { label: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthOrders = orders.filter(o => {
      const od = new Date(o.createdAt);
      return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
    });
    const total = monthOrders.reduce((s, o) => s + (o.totalCents ?? 0), 0);
    revenueByMonth.push({ label: d.toLocaleDateString("en-US", { month: "short" }), amount: total });
  }
  const maxRevenue = Math.max(...revenueByMonth.map(r => r.amount), 1);

  // Brief pipeline
  const briefCounts: Record<string, number> = {};
  briefs.forEach(b => { briefCounts[b.status] = (briefCounts[b.status] ?? 0) + 1; });
  const totalBriefs = briefs.length || 1;

  // Team utilization
  const tasksByAssignee: Record<string, number> = {};
  tasks.forEach(t => { if (t.assigneeId) tasksByAssignee[t.assigneeId] = (tasksByAssignee[t.assigneeId] ?? 0) + 1; });

  const TYPE_COLORS: Record<string, string> = { TASK: "bg-blue-100 text-blue-700", PROJECT: "bg-purple-100 text-purple-700", BRIEF: "bg-amber-100 text-amber-700", ORDER: "bg-emerald-100 text-emerald-700" };

  return (
    <ModuleLayoutShell moduleType="ANALYTICS">
    <div className="p-6 bg-[var(--bg-base)] min-h-full">
      <AnalyticsNav />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Business intelligence and performance metrics.</p>
        </div>
        <button onClick={() => openChatWithContext("Help me export an analytics report.")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Export Report
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-6 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5"><div className="h-3 w-20 bg-[var(--bg-surface)] rounded mb-2" /><div className="h-6 w-16 bg-[var(--bg-surface)] rounded" /></div>)}
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <MetricCard label="Total Tasks" value={tasks.length} href="/tasks" />
            <MetricCard label="Active Projects" value={activeProjects} color="text-blue-600" href="/projects" />
            <MetricCard label="Briefs in Review" value={briefsInReview} color="text-amber-600" href="/briefs" />
            <MetricCard label="Revenue (AED)" value={aed.format(totalRevenue / 100)} color="text-emerald-600" href="/orders" />
            <MetricCard label="Clients" value={clients.length} href="/clients" />
            <MetricCard label="Team Members" value={members.length} href="/team" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Task Velocity */}
            <div className="border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Task Velocity</h3>
                <a href="/tasks" className="text-xs text-[var(--accent)] hover:underline">View Details</a>
              </div>
              <div className="flex items-end gap-4 h-32">
                {velocity.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{v.count}</span>
                    <div className="w-full bg-[var(--accent)] rounded-t transition-all" style={{ height: `${(v.count / maxVelocity) * 100}%`, minHeight: v.count > 0 ? 8 : 2 }} />
                    <span className="text-[10px] text-[var(--text-tertiary)]">{v.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-2 text-center">Tasks completed per week (last 4 weeks)</p>
            </div>

            {/* Revenue Chart */}
            <div className="border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Revenue</h3>
                <a href="/orders" className="text-xs text-[var(--accent)] hover:underline">View Details</a>
              </div>
              <div className="flex items-end gap-3 h-32">
                {revenueByMonth.map((r, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-[var(--text-secondary)]">{r.amount > 0 ? aed.format(r.amount / 100) : "0"}</span>
                    <div className="w-full bg-emerald-500 rounded-t transition-all" style={{ height: `${(r.amount / maxRevenue) * 100}%`, minHeight: r.amount > 0 ? 8 : 2 }} />
                    <span className="text-[10px] text-[var(--text-tertiary)]">{r.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-2 text-center">Order totals per month (last 6 months)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Project Health */}
            <div className="border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Project Health</h3>
                <a href="/projects" className="text-xs text-[var(--accent)] hover:underline">View Details</a>
              </div>
              {projects.length === 0 ? <p className="text-xs text-[var(--text-tertiary)]">No projects</p> : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map(p => {
                    const daysLeft = p.endDate ? Math.max(0, Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000)) : null;
                    const progress = p.progress ?? (p.status === "COMPLETED" ? 100 : p.status === "ACTIVE" ? 50 : p.status === "ON_HOLD" ? 30 : 10);
                    return (
                      <div key={p.id} className="py-2 border-b border-[var(--border)] last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-[var(--text-primary)] truncate">{p.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-[var(--text-secondary)]"}`}>{p.status}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden mb-1">
                          <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
                          <span>{progress}% complete</span>
                          {daysLeft !== null && <span>{daysLeft}d remaining</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Brief Pipeline */}
            <div className="border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Brief Pipeline</h3>
                <a href="/briefs" className="text-xs text-[var(--accent)] hover:underline">View Details</a>
              </div>
              {briefs.length === 0 ? <p className="text-xs text-[var(--text-tertiary)]">No briefs</p> : (
                <>
                  <div className="flex h-6 rounded-full overflow-hidden mb-3">
                    {Object.entries(briefCounts).map(([status, count]) => (
                      <div key={status} style={{ width: `${(count / totalBriefs) * 100}%`, backgroundColor: BRIEF_STATUS_COLORS[status] ?? "#d1d5db" }}
                        title={`${status}: ${count}`} />
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(briefCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRIEF_STATUS_COLORS[status] ?? "#d1d5db" }} />
                          <span className="text-xs text-[var(--text-secondary)]">{status}</span>
                        </div>
                        <span className="text-xs font-medium text-[var(--text-secondary)]">{count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Recent Activity */}
            <div className="border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Activity</h3>
                <a href="/activity" className="text-xs text-[var(--accent)] hover:underline">View Details</a>
              </div>
              {activity.length === 0 ? <p className="text-xs text-[var(--text-tertiary)]">No recent activity.</p> : (
                <div className="space-y-2.5">
                  {activity.map(item => (
                    <div key={item.id} className="flex items-start gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${TYPE_COLORS[item.type] ?? "bg-[var(--bg-surface)] text-[var(--text-secondary)]"}`}>{item.type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--text-primary)] truncate">{item.title}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">{new Date(item.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-[var(--text-secondary)]"}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Team Utilization */}
          <div className="border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Team Utilization</h3>
              <a href="/team" className="text-xs text-[var(--accent)] hover:underline">View Details</a>
            </div>
            {members.length === 0 ? <p className="text-xs text-[var(--text-tertiary)]">No team members.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {members.map(m => {
                  const taskCount = tasksByAssignee[m.id] ?? 0;
                  const maxTasks = Math.max(...Object.values(tasksByAssignee), 1);
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--accent)]">
                        {(m.user?.name ?? m.user?.email ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{m.user?.name ?? m.user?.email ?? "Unknown"}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${(taskCount / maxTasks) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-[var(--text-secondary)]">{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
