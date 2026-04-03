"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import StatusBadge from "@/components/shared/StatusBadge";

interface Task {
  id: string;
  title: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface Brief {
  id: string;
  title: string;
  status: string;
}

interface Order {
  id: string;
  totalCents: number;
  status: string;
}

interface Client {
  id: string;
  name: string;
}

interface ActivityItem {
  id: string;
  type: string;
  entityId: string;
  title: string;
  status: string;
  updatedAt: string;
  href: string;
}

const aedFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

function countByStatus<T extends { status: string }>(items: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
  });
  return counts;
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function StatusBreakdown({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center justify-between">
            <StatusBadge status={status} />
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 w-6 text-right">{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  TASK: "bg-blue-100 text-blue-700",
  PROJECT: "bg-purple-100 text-purple-700",
  BRIEF: "bg-amber-100 text-amber-700",
  ORDER: "bg-emerald-100 text-emerald-700",
};

export default function AnalyticsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [tasksRes, projectsRes, briefsRes, ordersRes, clientsRes, activityRes] = await Promise.all([
        fetch("/api/v1/tasks", { headers }),
        fetch("/api/v1/projects", { headers }),
        fetch("/api/v1/briefs", { headers }),
        fetch("/api/v1/orders", { headers }),
        fetch("/api/v1/clients", { headers }),
        fetch("/api/v1/activity?limit=10", { headers }),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks ?? []);
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects ?? []);
      }
      if (briefsRes.ok) {
        const data = await briefsRes.json();
        setBriefs(data.briefs ?? []);
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders ?? []);
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients ?? []);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const activeBriefs = briefs.filter((b) => b.status !== "ARCHIVED" && b.status !== "COMPLETED").length;
  const tasksByStatus = countByStatus(tasks);
  const projectsByStatus = countByStatus(projects);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Business intelligence dashboards and trend analysis.</p>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <MetricCard label="Total Tasks" value={tasks.length} />
          <MetricCard label="Total Projects" value={projects.length} />
          <MetricCard label="Active Briefs" value={activeBriefs} />
          <MetricCard label="Revenue" value={aedFormatter.format(totalRevenue / 100)} color="text-emerald-600" />
          <MetricCard label="Clients" value={clients.length} />
        </div>
      )}

      {/* Status breakdowns + activity */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-3 w-full bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StatusBreakdown title="Tasks by Status" counts={tasksByStatus} />
          <StatusBreakdown title="Projects by Status" counts={projectsByStatus} />

          {/* Recent activity */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
            {activity.length === 0 ? (
              <p className="text-xs text-gray-500">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${TYPE_COLORS[item.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {item.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(item.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" "}
                        {new Date(item.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
