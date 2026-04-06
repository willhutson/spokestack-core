"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { SurveysNav } from "./SurveysNav";

type QuestionType = "text" | "rating" | "multiple-choice";
interface Question { text: string; type: QuestionType; options?: string[] }
interface SurveyData { title: string; questions: Question[]; status: string; responseCount: number }
interface ContextEntry { id: string; category: string; key: string; value: string; updatedAt: string }
interface SurveyResponse { surveyKey: string; answers: Record<string, string | number>; respondent?: string }

const TEMPLATES: { name: string; questions: Question[] }[] = [
  { name: "Customer Satisfaction", questions: [
    { text: "How satisfied are you with our service?", type: "rating" },
    { text: "How likely are you to recommend us?", type: "rating" },
    { text: "What do you value most about our service?", type: "multiple-choice", options: ["Quality", "Speed", "Price", "Support"] },
    { text: "What could we improve?", type: "text" },
    { text: "Any additional comments?", type: "text" },
  ]},
  { name: "Employee Engagement", questions: [
    { text: "I feel valued at work", type: "rating" },
    { text: "I understand the company vision", type: "rating" },
    { text: "My manager supports my growth", type: "rating" },
    { text: "I have the tools I need to succeed", type: "rating" },
    { text: "How is your work-life balance?", type: "multiple-choice", options: ["Excellent", "Good", "Fair", "Poor"] },
    { text: "I would recommend this workplace to a friend", type: "rating" },
    { text: "What motivates you most?", type: "text" },
    { text: "What would you change about the workplace?", type: "text" },
  ]},
  { name: "Product Feedback", questions: [
    { text: "How would you rate the product overall?", type: "rating" },
    { text: "How easy is the product to use?", type: "rating" },
    { text: "Which features do you use most?", type: "text" },
    { text: "What features are missing?", type: "text" },
    { text: "How does it compare to alternatives?", type: "multiple-choice", options: ["Much better", "Somewhat better", "About the same", "Worse"] },
    { text: "Would you recommend this product?", type: "rating" },
  ]},
  { name: "Event Feedback", questions: [
    { text: "How would you rate the event overall?", type: "rating" },
    { text: "How relevant was the content?", type: "multiple-choice", options: ["Very relevant", "Somewhat relevant", "Not relevant"] },
    { text: "What was the highlight?", type: "text" },
    { text: "Suggestions for future events?", type: "text" },
  ]},
];

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  Active: "bg-green-100 text-green-700",
  Closed: "bg-red-100 text-red-600",
};

function parseSurvey(e: ContextEntry): SurveyData & { key: string; updatedAt: string } {
  try {
    const v = JSON.parse(e.value);
    return { key: e.key, updatedAt: e.updatedAt, title: v.title ?? "", questions: v.questions ?? [], status: v.status ?? "Draft", responseCount: v.responseCount ?? 0 };
  } catch { return { key: e.key, updatedAt: e.updatedAt, title: e.key, questions: [], status: "Draft", responseCount: 0 }; }
}

function parseResponse(e: ContextEntry): SurveyResponse {
  try { const v = JSON.parse(e.value); return { surveyKey: v.surveyKey ?? "", answers: v.answers ?? {}, respondent: v.respondent }; }
  catch { return { surveyKey: "", answers: {}, respondent: undefined }; }
}

export default function SurveysPage() {
  const [tab, setTab] = useState<"surveys" | "responses" | "templates">("surveys");
  const [surveys, setSurveys] = useState<(SurveyData & { key: string; updatedAt: string })[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([{ text: "", type: "text" }]);

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [sRes, rRes] = await Promise.all([
        fetch("/api/v1/context?category=survey", { headers }),
        fetch("/api/v1/context?category=survey_response", { headers }),
      ]);
      if (sRes.ok) { const d = await sRes.json(); setSurveys((d.entries ?? []).map(parseSurvey)); }
      if (rRes.ok) { const d = await rRes.json(); setResponses((d.entries ?? []).map(parseResponse)); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSurvey = async (status = "Draft") => {
    if (!title.trim()) return;
    const headers = await getAuthHeaders();
    const key = `survey_${Date.now()}`;
    const value = { title, questions: questions.filter(q => q.text.trim()), status, responseCount: 0 };
    await fetch("/api/v1/context", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ entryType: "STRUCTURED", category: "survey", key, value }) });
    setShowForm(false); setTitle(""); setQuestions([{ text: "", type: "text" }]);
    load();
  };

  const updateStatus = async (s: typeof surveys[0], newStatus: string) => {
    const headers = await getAuthHeaders();
    const value = { title: s.title, questions: s.questions, status: newStatus, responseCount: s.responseCount };
    await fetch("/api/v1/context", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ entryType: "STRUCTURED", category: "survey", key: s.key, value }) });
    load();
  };

  const addQuestion = () => setQuestions([...questions, { text: "", type: "text" }]);
  const removeQuestion = (i: number) => setQuestions(questions.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, patch: Partial<Question>) => setQuestions(questions.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  const useTemplate = (t: typeof TEMPLATES[0]) => { setTitle(t.name); setQuestions([...t.questions]); setShowForm(true); setTab("surveys"); };

  // Group responses by survey
  const responsesBySurvey: Record<string, SurveyResponse[]> = {};
  responses.forEach(r => { if (!responsesBySurvey[r.surveyKey]) responsesBySurvey[r.surveyKey] = []; responsesBySurvey[r.surveyKey].push(r); });

  const tabs = [
    { id: "surveys" as const, label: "Surveys", count: surveys.length },
    { id: "responses" as const, label: "Responses", count: responses.length },
    { id: "templates" as const, label: "Templates", count: TEMPLATES.length },
  ];

  return (
    <ModuleLayoutShell moduleType="SURVEYS">
      <div className="p-6 bg-[var(--bg-base)] min-h-full">
      <SurveysNav />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Surveys</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Collect feedback and insights from clients and teams.</p>
        </div>
        <button onClick={() => { setShowForm(true); setTab("surveys"); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Create Survey
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"}`}>
            {t.label} <span className="ml-1 text-xs text-[var(--text-tertiary)]">({t.count})</span>
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">Loading...</div>}

      {/* Create Survey Form */}
      {!loading && tab === "surveys" && showForm && (
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Create Survey</h3>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Survey title"
            className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
          <div className="space-y-3 mb-4">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs text-[var(--text-tertiary)] mt-2.5 w-5">{i + 1}.</span>
                <input value={q.text} onChange={e => updateQuestion(i, { text: e.target.value })} placeholder="Question text"
                  className="flex-1 border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                <select value={q.type} onChange={e => updateQuestion(i, { type: e.target.value as QuestionType })}
                  className="border border-[var(--border-strong)] rounded-lg px-2 py-2 text-sm bg-[var(--bg-base)]">
                  <option value="text">Text</option>
                  <option value="rating">Rating</option>
                  <option value="multiple-choice">Multiple Choice</option>
                </select>
                {q.type === "multiple-choice" && (
                  <input value={(q.options ?? []).join(", ")} onChange={e => updateQuestion(i, { options: e.target.value.split(",").map(o => o.trim()) })}
                    placeholder="Options (comma-separated)" className="w-48 border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                )}
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-600 p-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addQuestion} className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)]">+ Add Question</button>
            <div className="flex-1" />
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
            <button onClick={() => saveSurvey("Draft")} className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700">Save as Draft</button>
            <button onClick={() => saveSurvey("Active")} className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)]">Save & Activate</button>
          </div>
        </div>
      )}

      {/* Surveys Tab */}
      {!loading && tab === "surveys" && !showForm && (
        surveys.length === 0 ? (
          <div className="text-center py-16 border border-[var(--border)] rounded-xl">
            <p className="text-sm text-[var(--text-secondary)] mb-2">No surveys yet</p>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">Create a survey or use a template to get started.</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)]">Create Survey</button>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-[var(--bg-base)]">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Title</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Questions</th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Responses</th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {surveys.map(s => (
                  <tr key={s.key} className="hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{s.title}</td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{s.questions.length}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-600"}`}>{s.status}</span></td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">{(responsesBySurvey[s.key] ?? []).length}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {s.status === "Draft" && <button onClick={() => updateStatus(s, "Active")} className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100">Activate</button>}
                        {s.status === "Active" && <button onClick={() => updateStatus(s, "Closed")} className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100">Close</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Responses Tab */}
      {!loading && tab === "responses" && (
        Object.keys(responsesBySurvey).length === 0 ? (
          <div className="text-center py-16 border border-[var(--border)] rounded-xl">
            <p className="text-sm text-[var(--text-secondary)] mb-1">No responses yet</p>
            <p className="text-xs text-[var(--text-tertiary)]">Responses will appear here once participants submit surveys.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(responsesBySurvey).map(([surveyKey, resps]) => {
              const survey = surveys.find(s => s.key === surveyKey);
              // Rating distribution
              const ratings: Record<number, number> = {};
              resps.forEach(r => Object.values(r.answers).forEach(a => { const n = Number(a); if (!isNaN(n) && n >= 1 && n <= 5) ratings[n] = (ratings[n] ?? 0) + 1; }));
              const maxRating = Math.max(...Object.values(ratings), 1);
              return (
                <div key={surveyKey} className="border border-[var(--border)] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{survey?.title ?? surveyKey}</h3>
                    <span className="text-xs text-[var(--text-tertiary)]">{resps.length} response{resps.length !== 1 ? "s" : ""}</span>
                  </div>
                  {Object.keys(ratings).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Rating Distribution</p>
                      <div className="flex items-end gap-2 h-20">
                        {[1, 2, 3, 4, 5].map(r => (
                          <div key={r} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full rounded-t" style={{ height: `${((ratings[r] ?? 0) / maxRating) * 100}%`, minHeight: ratings[r] ? 4 : 0, backgroundColor: r <= 2 ? "#ef4444" : r <= 3 ? "#f59e0b" : "#22c55e" }} />
                            <span className="text-[10px] text-[var(--text-secondary)]">{r}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">{ratings[r] ?? 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {resps.slice(0, 5).map((r, i) => (
                      <div key={i} className="bg-[var(--bg-base)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)]">
                        <span className="font-medium text-[var(--text-secondary)]">{r.respondent ?? `Respondent ${i + 1}`}:</span>{" "}
                        {Object.entries(r.answers).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                        {Object.keys(r.answers).length > 2 && " ..."}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Templates Tab */}
      {!loading && tab === "templates" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TEMPLATES.map(t => (
            <div key={t.name} className="border border-[var(--border)] rounded-xl p-5 hover:border-[var(--accent)] transition-colors">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{t.name}</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-3">{t.questions.length} questions</p>
              <div className="space-y-1 mb-4">
                {t.questions.slice(0, 3).map((q, i) => (
                  <p key={i} className="text-xs text-[var(--text-tertiary)] truncate">{i + 1}. {q.text} <span className="text-[var(--text-tertiary)]">({q.type})</span></p>
                ))}
                {t.questions.length > 3 && <p className="text-xs text-[var(--text-tertiary)]">+{t.questions.length - 3} more</p>}
              </div>
              <button onClick={() => useTemplate(t)} className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">Use Template</button>
            </div>
          ))}
        </div>
      )}
    </div>
    </ModuleLayoutShell>
  );
}
