"use client";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { openChatWithContext } from "@/lib/chat-event";

interface Client { id: string; name: string; email?: string; company?: string }
interface ContextEntry { id: string; key: string; value: string; updatedAt: string }
interface NpsResponse { clientId: string; clientName: string; score: number; comment: string; date: string }

function parseNpsResponse(e: ContextEntry): NpsResponse {
  try { const v = JSON.parse(e.value); return { clientId: v.clientId ?? "", clientName: v.clientName ?? "", score: v.score ?? 0, comment: v.comment ?? "", date: e.updatedAt }; }
  catch { return { clientId: "", clientName: "", score: 0, comment: "", date: e.updatedAt }; }
}

function NpsGauge({ score }: { score: number | null }) {
  const angle = score !== null ? ((score + 100) / 200) * 180 : 0;
  const color = score === null ? "#d1d5db" : score >= 50 ? "#22c55e" : score >= 0 ? "#f59e0b" : "#ef4444";
  return (
    <svg viewBox="0 0 200 120" className="w-48 h-28">
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round" />
      {score !== null && (
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 251.3} 251.3`}
          style={{ transition: "stroke-dasharray 1s ease" }} />
      )}
      <text x="100" y="90" textAnchor="middle" className="text-2xl font-bold" fill={color} fontSize="28" fontWeight="bold">
        {score !== null ? score : "\u2014"}
      </text>
      <text x="100" y="110" textAnchor="middle" fill="#9ca3af" fontSize="10">NPS Score</text>
    </svg>
  );
}

export default function NPSPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [responses, setResponses] = useState<NpsResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [surveyName, setSurveyName] = useState("");
  const [surveyClientId, setSurveyClientId] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [respClientId, setRespClientId] = useState("");
  const [respScore, setRespScore] = useState(0);
  const [respComment, setRespComment] = useState("");

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [cRes, rRes] = await Promise.all([
        fetch("/api/v1/clients", { headers }),
        fetch("/api/v1/context?category=nps_response", { headers }),
      ]);
      if (cRes.ok) { const d = await cRes.json(); setClients(d.clients ?? []); }
      if (rRes.ok) { const d = await rRes.json(); setResponses((d.entries ?? []).map(parseNpsResponse)); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const promoters = responses.filter(r => r.score >= 9);
  const passives = responses.filter(r => r.score >= 7 && r.score <= 8);
  const detractors = responses.filter(r => r.score <= 6);
  const total = responses.length;
  const npsScore = total > 0 ? Math.round(((promoters.length - detractors.length) / total) * 100) : null;

  // Client-level NPS
  const clientScores: Record<string, { name: string; scores: number[] }> = {};
  responses.forEach(r => {
    if (!clientScores[r.clientId]) clientScores[r.clientId] = { name: r.clientName || r.clientId, scores: [] };
    clientScores[r.clientId].scores.push(r.score);
  });

  // Trend: last 5 data points grouped by date
  const sortedByDate = [...responses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const trendPoints: { label: string; score: number }[] = [];
  const chunkSize = Math.max(1, Math.ceil(sortedByDate.length / 5));
  for (let i = 0; i < sortedByDate.length; i += chunkSize) {
    const chunk = sortedByDate.slice(i, i + chunkSize);
    const p = chunk.filter(r => r.score >= 9).length;
    const d = chunk.filter(r => r.score <= 6).length;
    const s = chunk.length > 0 ? Math.round(((p - d) / chunk.length) * 100) : 0;
    trendPoints.push({ label: new Date(chunk[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), score: s });
  }

  const createSurvey = async () => {
    if (!surveyName.trim()) return;
    const headers = await getAuthHeaders();
    await fetch("/api/v1/context", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ entryType: "STRUCTURED", category: "nps_survey", key: `nps_survey_${Date.now()}`, value: { name: surveyName, clientId: surveyClientId, emailSubject, createdAt: new Date().toISOString() } }) });
    setShowSurveyForm(false); setSurveyName(""); setSurveyClientId(""); setEmailSubject("");
    openChatWithContext(`NPS survey "${surveyName}" created. Help me send it to the selected clients.`);
  };

  const recordResponse = async () => {
    const client = clients.find(c => c.id === respClientId);
    const headers = await getAuthHeaders();
    await fetch("/api/v1/context", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ entryType: "STRUCTURED", category: "nps_response", key: `nps_resp_${Date.now()}`, value: { clientId: respClientId, clientName: client?.name ?? "", score: respScore, comment: respComment } }) });
    setShowResponseForm(false); setRespClientId(""); setRespScore(0); setRespComment("");
    load();
  };

  const pctOf = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <ModuleLayoutShell moduleType="NPS">
    <div className="p-6 bg-[var(--bg-base)] min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">NPS</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Net Promoter Score tracking and analysis.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowResponseForm(true)} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">Record Response</button>
          <button onClick={() => setShowSurveyForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Create NPS Survey
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">Loading...</div>}

      {!loading && (
        <div className="space-y-6">
          {/* NPS Gauge + Breakdown */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col items-center justify-center border border-[var(--border)] rounded-xl p-6 min-w-[220px]">
              <NpsGauge score={npsScore} />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">{total} total response{total !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div className="border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-green-400" /><span className="text-xs font-medium text-[var(--text-secondary)]">Promoters (9-10)</span></div>
                <p className="text-2xl font-bold text-green-600">{promoters.length}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{pctOf(promoters.length)}%</p>
              </div>
              <div className="border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-yellow-400" /><span className="text-xs font-medium text-[var(--text-secondary)]">Passives (7-8)</span></div>
                <p className="text-2xl font-bold text-yellow-600">{passives.length}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{pctOf(passives.length)}%</p>
              </div>
              <div className="border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-red-400" /><span className="text-xs font-medium text-[var(--text-secondary)]">Detractors (0-6)</span></div>
                <p className="text-2xl font-bold text-red-600">{detractors.length}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{pctOf(detractors.length)}%</p>
              </div>
            </div>
          </div>

          {/* Trend */}
          {trendPoints.length > 0 && (
            <div className="border border-[var(--border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">NPS Trend</h3>
              <div className="flex items-end gap-3 h-24">
                {trendPoints.map((tp, i) => {
                  const normalized = ((tp.score + 100) / 200) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-[var(--text-secondary)]">{tp.score}</span>
                      <div className="w-full rounded-t" style={{ height: `${Math.max(normalized, 4)}%`, backgroundColor: tp.score >= 50 ? "#22c55e" : tp.score >= 0 ? "#f59e0b" : "#ef4444", transition: "height 0.5s ease" }} />
                      <span className="text-[10px] text-[var(--text-tertiary)]">{tp.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Client-level NPS */}
          {Object.keys(clientScores).length > 0 && (
            <div className="border border-[var(--border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Client-level NPS</h3>
              <div className="space-y-2">
                {Object.entries(clientScores).map(([cid, data]) => {
                  const p = data.scores.filter(s => s >= 9).length;
                  const d = data.scores.filter(s => s <= 6).length;
                  const cs = data.scores.length > 0 ? Math.round(((p - d) / data.scores.length) * 100) : 0;
                  return (
                    <div key={cid} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                      <span className="text-sm text-[var(--text-secondary)]">{data.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--text-tertiary)]">{data.scores.length} response{data.scores.length !== 1 ? "s" : ""}</span>
                        <span className={`text-sm font-bold ${cs >= 50 ? "text-green-600" : cs >= 0 ? "text-yellow-600" : "text-red-600"}`}>{cs}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create NPS Survey Form */}
          {showSurveyForm && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowSurveyForm(false)}>
              <div className="bg-[var(--bg-base)] rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Create NPS Survey</h3>
                <div className="space-y-3">
                  <input value={surveyName} onChange={e => setSurveyName(e.target.value)} placeholder="Survey name" className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                  <select value={surveyClientId} onChange={e => setSurveyClientId(e.target.value)} className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-base)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                    <option value="">All clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject" className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => setShowSurveyForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                  <button onClick={createSurvey} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)]">Create</button>
                </div>
              </div>
            </div>
          )}

          {/* Record Response Form */}
          {showResponseForm && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowResponseForm(false)}>
              <div className="bg-[var(--bg-base)] rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Record NPS Response</h3>
                <div className="space-y-3">
                  <select value={respClientId} onChange={e => setRespClientId(e.target.value)} className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-base)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Score (0-10)</label>
                    <div className="flex gap-1">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button key={i} onClick={() => setRespScore(i)}
                          className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${respScore === i ? (i >= 9 ? "bg-green-500 text-white" : i >= 7 ? "bg-yellow-500 text-white" : "bg-red-500 text-white") : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>{i}</button>
                      ))}
                    </div>
                  </div>
                  <textarea value={respComment} onChange={e => setRespComment(e.target.value)} placeholder="Comment (optional)" rows={3} className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => setShowResponseForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                  <button onClick={recordResponse} disabled={!respClientId} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50">Record</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
