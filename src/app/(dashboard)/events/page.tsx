"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";
import StatusBadge from "@/components/shared/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Project {
  id: string; name: string; status: string; description?: string;
  metadata?: Record<string, unknown>; createdAt: string;
}
interface ContextEntry {
  id: string; key: string; value: string; category: string;
  metadata?: Record<string, unknown>; createdAt: string;
}
interface Task {
  id: string; title: string; status: string; priority?: string;
  metadata?: Record<string, unknown>; createdAt: string; dueDate?: string;
}
interface Order {
  id: string; status: string; totalCents: number; currency?: string;
  metadata?: Record<string, unknown>; createdAt: string;
  client?: { id: string; name: string } | null;
}

type Tab = "events" | "guests" | "run_of_show" | "budget";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "events", label: "Events" },
  { key: "guests", label: "Guest Lists" },
  { key: "run_of_show", label: "Run of Show" },
  { key: "budget", label: "Budget" },
];

const RSVP_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-600",
  declined: "bg-red-50 text-red-600",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtAED(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(v);
}

/* ------------------------------------------------------------------ */
/*  Create Event Form                                                  */
/* ------------------------------------------------------------------ */
function CreateEventForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [venue, setVenue] = useState(""); const [eventDate, setEventDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Event name is required."); return; }
    setErr(null); setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/projects", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), description: description.trim() || undefined,
          status: "PLANNING",
          metadata: { type: "event", venue: venue.trim(), eventDate: eventDate || undefined },
        }),
      });
      if (!res.ok) { setErr(`Failed: ${(await res.text()) || res.statusText}`); return; }
      onCreated();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Unexpected error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Create Event</h2>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Event Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Event name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Venue</label>
            <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Venue name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {submitting ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function EventsPage() {
  const [tab, setTab] = useState<Tab>("events");
  const [events, setEvents] = useState<Project[]>([]);
  const [guests, setGuests] = useState<ContextEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [eRes, gRes, tRes, oRes] = await Promise.all([
        fetch("/api/v1/projects", { headers }),
        fetch("/api/v1/context?category=event_guest", { headers }),
        fetch("/api/v1/tasks", { headers }),
        fetch("/api/v1/orders", { headers }),
      ]);
      if (eRes.ok) {
        const data = await eRes.json();
        setEvents((data.projects ?? []).filter((p: Project) => p.metadata?.type === "event"));
      }
      if (gRes.ok) setGuests((await gRes.json()).entries ?? []);
      if (tRes.ok) {
        const data = await tRes.json();
        setTasks((data.tasks ?? []).filter((t: Task) => t.metadata?.type === "run_of_show"));
      }
      if (oRes.ok) {
        const data = await oRes.json();
        setOrders((data.orders ?? []).filter((o: Order) => o.metadata?.type === "event_vendor"));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function parseVal(v: string): Record<string, unknown> {
    try { return JSON.parse(v); } catch { return {}; }
  }

  const guestStats = useMemo(() => {
    let confirmed = 0; let pending = 0; let declined = 0;
    guests.forEach(g => {
      const d = parseVal(g.value);
      const rsvp = (d.rsvp as string) || "pending";
      if (rsvp === "confirmed") confirmed++;
      else if (rsvp === "declined") declined++;
      else pending++;
    });
    return { confirmed, pending, declined, total: guests.length };
  }, [guests]);

  const budgetTotal = useMemo(() => orders.reduce((s, o) => s + o.totalCents, 0), [orders]);
  const budgetPaid = useMemo(() => orders.filter(o => o.status === "PAID" || o.status === "COMPLETED").reduce((s, o) => s + o.totalCents, 0), [orders]);

  const Skeleton = () => (
    <div className="animate-pulse bg-white border border-gray-200 rounded-xl overflow-hidden">
      {[1, 2, 3].map(i => (
        <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-gray-100 last:border-b-0">
          <div className="h-4 w-32 bg-gray-200 rounded" /><div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-200 rounded-full ml-auto" />
        </div>
      ))}
    </div>
  );

  /* Calendar-style month view for events */
  const eventsByMonth = useMemo(() => {
    const map: Record<string, Project[]> = {};
    events.forEach(ev => {
      const d = (ev.metadata?.eventDate as string) || ev.createdAt;
      const month = new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      (map[month] ??= []).push(ev);
    });
    return Object.entries(map).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }, [events]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plan events, manage guest lists, and track budgets.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openChatWithContext("Help me plan and organize an event.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Ask Agent</button>
          {tab === "events" && !showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Create Event</button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Events</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{events.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Guests Confirmed</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{guestStats.confirmed}/{guestStats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Run of Show Items</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{tasks.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Budget</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{fmtAED(budgetTotal / 100)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TAB_LABELS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {showForm && tab === "events" && <CreateEventForm onCreated={() => { setShowForm(false); reload(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <Skeleton /> : (
        <>
          {/* Events Calendar + Cards */}
          {tab === "events" && (
            events.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No events yet</h3>
                <p className="text-xs text-gray-500 mb-4">Create your first event to get started.</p>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Create Event</button>
              </div>
            ) : (
              <div className="space-y-6">
                {eventsByMonth.map(([month, evts]) => (
                  <div key={month}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">{month}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {evts.map(ev => (
                        <div key={ev.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">{ev.name}</h4>
                              {ev.metadata?.venue ? <p className="text-xs text-gray-500 mt-0.5">{String(ev.metadata.venue)}</p> : null}
                            </div>
                            <StatusBadge status={ev.status} />
                          </div>
                          {ev.description && <p className="text-xs text-gray-600 mb-2 line-clamp-2">{ev.description}</p>}
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{ev.metadata?.eventDate ? fmtDate(ev.metadata.eventDate as string) : fmtDate(ev.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Guest Lists */}
          {tab === "guests" && (
            guests.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No guests yet</h3>
                <p className="text-xs text-gray-500 mb-4">Add guests and track RSVP status for your events.</p>
                <button onClick={() => openChatWithContext("Help me create a guest list for an upcoming event.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Add Guests</button>
              </div>
            ) : (
              <div>
                <div className="flex gap-3 mb-4">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-medium">Confirmed: {guestStats.confirmed}</span>
                  <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-xs font-medium">Pending: {guestStats.pending}</span>
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium">Declined: {guestStats.declined}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Guest</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Organization</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Email</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">RSVP</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Table/Seat</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {guests.map(g => { const d = parseVal(g.value); const rsvp = (d.rsvp as string) || "pending"; return (
                        <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4 text-sm font-medium text-gray-900">{g.key}</td>
                          <td className="px-5 py-4 text-sm text-gray-600">{(d.organization as string) || "-"}</td>
                          <td className="px-5 py-4 text-sm text-gray-600">{(d.email as string) || "-"}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RSVP_COLORS[rsvp] || RSVP_COLORS.pending}`}>
                              {rsvp}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">{(d.table as string) || "-"}</td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Run of Show */}
          {tab === "run_of_show" && (
            tasks.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No run of show items</h3>
                <p className="text-xs text-gray-500 mb-4">Build your event timeline with scheduled activities.</p>
                <button onClick={() => openChatWithContext("Help me create a run of show timeline for an event.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Build Timeline</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-6">
                    {tasks.sort((a, b) => {
                      const tA = (a.metadata?.time as string) || a.createdAt;
                      const tB = (b.metadata?.time as string) || b.createdAt;
                      return tA.localeCompare(tB);
                    }).map(t => {
                      const time = (t.metadata?.time as string) || "";
                      return (
                        <div key={t.id} className="relative pl-10">
                          <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${t.status === "DONE" ? "bg-emerald-500 border-emerald-500" : t.status === "IN_PROGRESS" ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`} />
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                {time && <span className="text-xs font-mono font-medium text-indigo-600">{time}</span>}
                                <h4 className="text-sm font-medium text-gray-900">{t.title}</h4>
                              </div>
                              {t.metadata?.notes ? <p className="text-xs text-gray-500 mt-0.5">{String(t.metadata.notes)}</p> : null}
                            </div>
                            <StatusBadge status={t.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          )}

          {/* Budget */}
          {tab === "budget" && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Budget</p>
                  <p className="text-2xl font-bold text-gray-900">{fmtAED(budgetTotal / 100)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500 mb-1">Paid</p>
                  <p className="text-2xl font-bold text-emerald-600">{fmtAED(budgetPaid / 100)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500 mb-1">Outstanding</p>
                  <p className="text-2xl font-bold text-amber-600">{fmtAED((budgetTotal - budgetPaid) / 100)}</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No vendor costs yet</h3>
                  <p className="text-xs text-gray-500 mb-4">Track vendor contracts and payments for your events.</p>
                  <button onClick={() => openChatWithContext("Help me set up event vendor budget tracking.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Add Vendor</button>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Vendor</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Description</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount (AED)</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4 text-sm font-medium text-gray-900">{o.client?.name || (o.metadata?.vendor as string) || `Vendor #${o.id.slice(-6)}`}</td>
                          <td className="px-5 py-4 text-sm text-gray-600">{(o.metadata?.description as string) || "-"}</td>
                          <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
                          <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">{fmtAED(o.totalCents / 100)}</td>
                          <td className="px-5 py-4 text-right text-xs text-gray-500">{fmtDate(o.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
