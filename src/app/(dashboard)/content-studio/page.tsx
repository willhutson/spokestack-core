"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { StudioNav } from "./StudioNav";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Library {
  id: string; name: string; slug: string; libraryType: string;
  visibility: string; createdAt: string;
  _count: { folders: number; assets: number };
}
interface Asset {
  id: string; name: string; assetType: string; url?: string;
  tags?: string[]; createdAt: string; updatedAt: string;
  versions?: { id: string; versionNumber: number; createdAt: string }[];
}
interface Brief {
  id: string; title: string; status: string; dueDate?: string;
  metadata?: Record<string, unknown>; createdAt: string;
}

type Tab = "libraries" | "moodboards" | "video" | "documents" | "calendar";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "libraries", label: "Libraries" },
  { key: "moodboards", label: "Moodboards" },
  { key: "video", label: "Video Projects" },
  { key: "documents", label: "Documents" },
  { key: "calendar", label: "Calendar" },
];

const TYPE_STYLES: Record<string, string> = {
  GENERAL: "bg-gray-100 text-gray-600",
  BRAND: "bg-purple-50 text-purple-600",
  CLIENT: "bg-blue-50 text-blue-600",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function weekDates(): Date[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  New Library Form                                                   */
/* ------------------------------------------------------------------ */
function NewLibraryForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [libraryType, setLibraryType] = useState("GENERAL");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required."); return; }
    setErr(null); setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/assets/libraries", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), libraryType }),
      });
      if (!res.ok) { setErr(`Failed: ${(await res.text()) || res.statusText}`); return; }
      onCreated();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Unexpected error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">New Library</h2>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Library name" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select value={libraryType} onChange={(e) => setLibraryType(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="GENERAL">General</option>
              <option value="BRAND">Brand</option>
              <option value="CLIENT">Client</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {submitting ? "Creating..." : "Create Library"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ContentStudioPage() {
  const [tab, setTab] = useState<Tab>("libraries");
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [libAssets, setLibAssets] = useState<Asset[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [libRes, assetRes, briefRes] = await Promise.all([
        fetch("/api/v1/assets/libraries", { headers }),
        fetch("/api/v1/assets", { headers }),
        fetch("/api/v1/briefs", { headers }),
      ]);
      if (libRes.ok) setLibraries((await libRes.json()).libraries ?? []);
      if (assetRes.ok) setAssets((await assetRes.json()).assets ?? []);
      if (briefRes.ok) setBriefs((await briefRes.json()).briefs ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function expandLibrary(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/assets?libraryId=${id}`, { headers });
      if (res.ok) setLibAssets((await res.json()).assets ?? []);
      else setLibAssets([]);
    } catch { setLibAssets([]); }
  }

  const moodboards = useMemo(() => libraries.filter((l) => l.libraryType === "BRAND"), [libraries]);
  const imageAssets = useMemo(() => assets.filter((a) => a.assetType === "IMAGE"), [assets]);
  const documents = useMemo(() => assets.filter((a) => a.assetType === "DOCUMENT"), [assets]);
  const videoBriefs = useMemo(() => briefs.filter((b) => b.status === "ACTIVE"), [briefs]);
  const week = useMemo(() => weekDates(), []);

  const briefsByDate = useMemo(() => {
    const map: Record<string, Brief[]> = {};
    briefs.forEach((b) => {
      if (b.dueDate) {
        const key = new Date(b.dueDate).toISOString().slice(0, 10);
        (map[key] ??= []).push(b);
      }
    });
    return map;
  }, [briefs]);

  const Loader = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-20 bg-gray-200 rounded mb-4" />
          <div className="flex gap-4"><div className="h-3 w-16 bg-gray-200 rounded" /><div className="h-3 w-16 bg-gray-200 rounded" /></div>
        </div>
      ))}
    </div>
  );

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
    <StudioNav />
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage content assets with AI assistance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openChatWithContext("Help me upload a new asset to my content library.")} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Upload Asset</button>
          {tab === "libraries" && !showForm && (
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">New Library</button>
          )}
          {tab === "moodboards" && (
            <button onClick={() => openChatWithContext("Create a new moodboard for my project.")} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Create Moodboard</button>
          )}
          {tab === "video" && (
            <button onClick={() => openChatWithContext("Create a video project brief.")} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">New Video Project</button>
          )}
          {tab === "documents" && (
            <button onClick={() => openChatWithContext("Create a new document.")} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">New Document</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TAB_LABELS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setExpandedId(null); }} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {showForm && tab === "libraries" && <NewLibraryForm onCreated={() => { setShowForm(false); reload(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <Loader /> : (
        <>
          {/* Libraries */}
          {tab === "libraries" && (
            libraries.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No asset libraries yet</h3>
                <p className="text-xs text-gray-500 mb-4">Create one to start organizing your content.</p>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">New Library</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {libraries.map((lib) => (
                  <div key={lib.id} onClick={() => expandLibrary(lib.id)} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">{lib.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[lib.libraryType] ?? "bg-gray-100 text-gray-600"}`}>{lib.libraryType}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{lib._count.folders} folder{lib._count.folders !== 1 ? "s" : ""}</span>
                      <span>{lib._count.assets} asset{lib._count.assets !== 1 ? "s" : ""}</span>
                    </div>
                    {expandedId === lib.id && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                          <div><span className="font-medium text-gray-500">Visibility:</span> {lib.visibility}</div>
                          <div><span className="font-medium text-gray-500">Created:</span> {fmtDate(lib.createdAt)}</div>
                        </div>
                        {libAssets.length > 0 ? (
                          <div className="space-y-1">{libAssets.slice(0, 8).map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="w-2 h-2 rounded-full bg-indigo-400" />
                              <span className="truncate">{a.name}</span>
                              <span className="ml-auto text-gray-400">{a.assetType}</span>
                            </div>
                          ))}</div>
                        ) : <p className="text-xs text-gray-400">No assets in this library.</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* Moodboards */}
          {tab === "moodboards" && (
            moodboards.length === 0 && imageAssets.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No moodboards yet</h3>
                <p className="text-xs text-gray-500 mb-4">Create a BRAND library to use as a moodboard.</p>
                <button onClick={() => openChatWithContext("Create a new moodboard for my project.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Create Moodboard</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {moodboards.map((mb) => (
                  <div key={mb.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
                    <div className="grid grid-cols-3 gap-0.5 bg-gray-100 h-32">
                      {imageAssets.slice(0, 6).map((img, i) => (
                        <div key={i} className="bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                          {img.url ? <img src={img.url} alt="" className="w-full h-full object-cover" /> : "IMG"}
                        </div>
                      ))}
                      {imageAssets.length < 6 && Array.from({ length: 6 - Math.min(imageAssets.length, 6) }).map((_, i) => (
                        <div key={`ph-${i}`} className="bg-gray-100" />
                      ))}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900">{mb.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{mb._count.assets} asset{mb._count.assets !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Video Projects */}
          {tab === "video" && (
            videoBriefs.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No video projects</h3>
                <p className="text-xs text-gray-500 mb-4">Start a video project brief with AI.</p>
                <button onClick={() => openChatWithContext("Create a video project brief.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">New Video Project</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoBriefs.map((b) => (
                  <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">{b.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status] ?? "bg-gray-100 text-gray-600"}`}>{b.status}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Script:</span>
                        <span className="ml-auto font-medium">{b.metadata?.scriptStatus as string ?? "Pending"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>Storyboard:</span>
                        <span className="ml-auto font-medium">{b.metadata?.storyboardStatus as string ?? "Pending"}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Created {fmtDate(b.createdAt)}</p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Documents */}
          {tab === "documents" && (
            documents.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <h3 className="text-sm font-medium text-gray-900 mb-1">No documents</h3>
                <p className="text-xs text-gray-500 mb-4">Create a document with AI assistance.</p>
                <button onClick={() => openChatWithContext("Create a new document.")} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">New Document</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Versions</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documents.map((doc) => (
                      <tr key={doc.id} onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-5 py-4" colSpan={expandedId === doc.id ? 4 : undefined}>
                          {expandedId === doc.id ? (
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900 mb-2">{doc.name}</h3>
                              <p className="text-xs text-gray-500 mb-2">Type: {doc.assetType} | Updated: {fmtDate(doc.updatedAt)}</p>
                              <h4 className="text-xs font-medium text-gray-700 mb-1">Version History</h4>
                              {doc.versions && doc.versions.length > 0 ? (
                                <div className="space-y-1">
                                  {doc.versions.map((v) => (
                                    <div key={v.id} className="flex items-center gap-2 text-xs text-gray-600">
                                      <span className="font-medium">v{v.versionNumber}</span>
                                      <span className="text-gray-400">{fmtDate(v.createdAt)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-xs text-gray-400">No version history available.</p>}
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                          )}
                        </td>
                        {expandedId !== doc.id && (
                          <>
                            <td className="px-5 py-4 text-sm text-gray-600">{doc.assetType}</td>
                            <td className="px-5 py-4 text-sm text-gray-600">{doc.versions?.length ?? 0}</td>
                            <td className="px-5 py-4 text-sm text-gray-600">{fmtDate(doc.updatedAt)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Calendar */}
          {tab === "calendar" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">This Week</h2>
                <button onClick={() => openChatWithContext("Add a content deadline to my calendar.")} className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Add to Calendar</button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {week.map((day) => {
                  const key = day.toISOString().slice(0, 10);
                  const dayBriefs = briefsByDate[key] ?? [];
                  const isToday = key === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={key} className={`bg-white border rounded-xl p-3 min-h-[140px] ${isToday ? "border-indigo-300 ring-1 ring-indigo-100" : "border-gray-200"}`}>
                      <div className="text-xs font-medium text-gray-500 mb-1">{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                      <div className={`text-lg font-bold mb-2 ${isToday ? "text-indigo-600" : "text-gray-900"}`}>{day.getDate()}</div>
                      <div className="space-y-1">
                        {dayBriefs.map((b) => (
                          <div key={b.id} className={`px-2 py-1 rounded text-xs font-medium truncate ${STATUS_COLOR[b.status] ?? "bg-gray-100 text-gray-600"}`}>{b.title}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
