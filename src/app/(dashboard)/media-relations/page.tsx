"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";
import StatusBadge from "@/components/shared/StatusBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContextEntry {
  id: string; key: string; value: string; category: string;
  confidence?: number; metadata?: Record<string, unknown>; createdAt: string;
}
interface Brief {
  id: string; title: string; status: string; content?: string;
  metadata?: Record<string, unknown>; createdAt: string;
}

type Tab = "journalists" | "media_lists" | "pitches" | "coverage";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "journalists", label: "Journalists" },
  { key: "media_lists", label: "Media Lists" },
  { key: "pitches", label: "Pitches" },
  { key: "coverage", label: "Coverage" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtAED(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(v);
}

/* ------------------------------------------------------------------ */
/*  Add Journalist Form                                                */
/* ------------------------------------------------------------------ */
function AddJournalistForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState(""); const [outlet, setOutlet] = useState("");
  const [beat, setBeat] = useState(""); const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required."); return; }
    setErr(null); setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/context", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "entity", category: "journalist", key: name.trim(),
          value: JSON.stringify({ outlet: outlet.trim(), beat: beat.trim(), email: email.trim() }),
        }),
      });
      if (!res.ok) { setErr(`Failed: ${(await res.text()) || res.statusText}`); return; }
      onCreated();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Unexpected error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add Journalist</h2>
        <button onClick={onCancel} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">Cancel</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Journalist name" className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" /></div>
          <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Outlet</label>
            <input value={outlet} onChange={e => setOutlet(e.target.value)} placeholder="e.g. Gulf News" className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" /></div>
          <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Beat</label>
            <input value={beat} onChange={e => setBeat(e.target.value)} placeholder="e.g. Technology" className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" /></div>
          <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@outlet.com" className="w-full h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" /></div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
            {submitting ? "Adding..." : "Add Journalist"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function MediaRelationsPage() {
  const [tab, setTab] = useState<Tab>("journalists");
  const [journalists, setJournalists] = useState<ContextEntry[]>([]);
  const [mediaLists, setMediaLists] = useState<ContextEntry[]>([]);
  const [pitches, setPitches] = useState<Brief[]>([]);
  const [coverage, setCoverage] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [jRes, mRes, pRes, cRes] = await Promise.all([
        fetch("/api/v1/context?category=journalist", { headers }),
        fetch("/api/v1/context?category=media_list", { headers }),
        fetch("/api/v1/briefs", { headers }),
        fetch("/api/v1/context?category=coverage", { headers }),
      ]);
      if (jRes.ok) setJournalists((await jRes.json()).entries ?? []);
      if (mRes.ok) setMediaLists((await mRes.json()).entries ?? []);
      if (pRes.ok) {
        const data = await pRes.json();
        setPitches((data.briefs ?? []).filter((b: Brief) => b.metadata?.type === "pitch"));
      }
      if (cRes.ok) setCoverage((await cRes.json()).entries ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const totalAVE = useMemo(() => coverage.reduce((s, c) => {
    try { const v = JSON.parse(c.value); return s + (Number(v.ave) || 0); } catch { return s; }
  }, 0), [coverage]);

  const Skeleton = () => (
    <div className="animate-pulse bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
      {[1, 2, 3].map(i => (
        <div key={i} className="px-5 py-4 flex items-center gap-6 border-b border-[var(--border)] last:border-b-0">
          <div className="h-4 w-32 bg-[var(--bg-surface)] rounded" /><div className="h-4 w-40 bg-[var(--bg-surface)] rounded" />
          <div className="h-5 w-16 bg-[var(--bg-surface)] rounded-full ml-auto" />
        </div>
      ))}
    </div>
  );

  function parseVal(v: string): Record<string, unknown> {
    try { return JSON.parse(v); } catch { return {}; }
  }

  return (
    <ModuleLayoutShell moduleType="MEDIA_RELATIONS">
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Media Relations</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage journalist contacts, pitches, and coverage tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openChatWithContext("Help me with media relations strategy and journalist outreach.")} className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">Ask Agent</button>
          {tab === "journalists" && !showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">Add Journalist</button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-secondary)]">Journalists</p>
          <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{journalists.length}</p>
        </div>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-secondary)]">Media Lists</p>
          <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{mediaLists.length}</p>
        </div>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-secondary)]">Active Pitches</p>
          <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{pitches.length}</p>
        </div>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-secondary)]">Total AVE</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{fmtAED(totalAVE)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {TAB_LABELS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {showForm && tab === "journalists" && <AddJournalistForm onCreated={() => { setShowForm(false); reload(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <Skeleton /> : (
        <>
          {/* Journalists */}
          {tab === "journalists" && (
            journalists.length === 0 ? (
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No journalists yet</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">Add journalist contacts to build your media database.</p>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">Add Journalist</button>
              </div>
            ) : (
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-[var(--border)] bg-[var(--bg-base)]">
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Outlet</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Beat</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Email</th>
                    <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Added</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {journalists.map(j => { const d = parseVal(j.value); return (
                      <tr key={j.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">{j.key}</td>
                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{(d.outlet as string) || "-"}</td>
                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{(d.beat as string) || "-"}</td>
                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{(d.email as string) || "-"}</td>
                        <td className="px-5 py-4 text-right text-xs text-[var(--text-secondary)]">{fmtDate(j.createdAt)}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Media Lists */}
          {tab === "media_lists" && (
            mediaLists.length === 0 ? (
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No media lists yet</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">Create curated lists of media contacts for targeted outreach.</p>
                <button onClick={() => openChatWithContext("Create a new media list for targeted journalist outreach.")} className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">Create Media List</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaLists.map(ml => { const d = parseVal(ml.value); return (
                  <div key={ml.id} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-strong)] transition-colors">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{ml.key}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mb-3">{(d.description as string) || "No description"}</p>
                    <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                      <span>{(d.count as number) || 0} contacts</span>
                      <span>{fmtDate(ml.createdAt)}</span>
                    </div>
                  </div>
                ); })}
              </div>
            )
          )}

          {/* Pitches */}
          {tab === "pitches" && (
            pitches.length === 0 ? (
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No pitches yet</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">Draft media pitches to send to journalists.</p>
                <button onClick={() => openChatWithContext("Help me draft a media pitch for journalist outreach.")} className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">Draft Pitch</button>
              </div>
            ) : (
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-[var(--border)] bg-[var(--bg-base)]">
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Created</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {pitches.map(p => (
                      <tr key={p.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">{p.title}</td>
                        <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-4 text-right text-xs text-[var(--text-secondary)]">{fmtDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Coverage */}
          {tab === "coverage" && (
            coverage.length === 0 ? (
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No coverage tracked yet</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">Track media mentions and calculate advertising value equivalent.</p>
                <button onClick={() => openChatWithContext("Help me log a media coverage hit and calculate its AVE.")} className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">Log Coverage</button>
              </div>
            ) : (
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-[var(--border)] bg-[var(--bg-base)]">
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Headline</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Outlet</th>
                    <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Type</th>
                    <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">AVE (AED)</th>
                    <th className="text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">Date</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {coverage.map(c => { const d = parseVal(c.value); return (
                      <tr key={c.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">{c.key}</td>
                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{(d.outlet as string) || "-"}</td>
                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{(d.type as string) || "-"}</td>
                        <td className="px-5 py-4 text-right text-sm font-medium text-emerald-600">{fmtAED(Number(d.ave) || 0)}</td>
                        <td className="px-5 py-4 text-right text-xs text-[var(--text-secondary)]">{fmtDate(c.createdAt)}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
