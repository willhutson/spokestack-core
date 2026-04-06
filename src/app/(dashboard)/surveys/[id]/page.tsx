"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { cn } from "@/lib/utils";

interface Question {
  text: string;
  type: string;
  options?: string[];
}

interface SurveyData {
  title: string;
  questions: Question[];
  status: string;
  responseCount: number;
}

interface ContextEntry {
  id: string;
  category: string;
  key: string;
  value: string;
  updatedAt: string;
}

interface SurveyResponse {
  surveyKey: string;
  answers: Record<string, string | number>;
  respondent?: string;
  submittedAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-[var(--bg-surface)] text-[var(--text-secondary)]",
  Active: "bg-green-100 text-green-700",
  Closed: "bg-red-100 text-red-600",
};

const TYPE_ICONS: Record<string, string> = {
  text: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12",
  rating: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
  "multiple-choice": "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
};

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"questions" | "responses">("questions");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [sRes, rRes] = await Promise.all([
        fetch(`/api/v1/context?category=survey&key=${surveyId}`, { headers }),
        fetch(`/api/v1/context?category=survey_response`, { headers }),
      ]);
      if (sRes.ok) {
        const d = await sRes.json();
        const entries: ContextEntry[] = d.entries ?? [];
        const entry = entries.find((e) => e.key === surveyId);
        if (entry) {
          try {
            const v = JSON.parse(entry.value);
            setSurvey({
              title: v.title ?? surveyId,
              questions: v.questions ?? [],
              status: v.status ?? "Draft",
              responseCount: v.responseCount ?? 0,
            });
          } catch {
            setSurvey({ title: surveyId, questions: [], status: "Draft", responseCount: 0 });
          }
        }
      }
      if (rRes.ok) {
        const d = await rRes.json();
        const allResponses: SurveyResponse[] = (d.entries ?? []).map((e: ContextEntry) => {
          try {
            const v = JSON.parse(e.value);
            return { surveyKey: v.surveyKey ?? "", answers: v.answers ?? {}, respondent: v.respondent, submittedAt: e.updatedAt };
          } catch {
            return { surveyKey: "", answers: {} };
          }
        });
        setResponses(allResponses.filter((r) => r.surveyKey === surveyId));
      }
    } catch {
      // API unavailable
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (newStatus: string) => {
    if (!survey) return;
    const headers = await getAuthHeaders();
    const value = { title: survey.title, questions: survey.questions, status: newStatus, responseCount: survey.responseCount };
    await fetch("/api/v1/context", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ entryType: "STRUCTURED", category: "survey", key: surveyId, value }),
    });
    setSurvey({ ...survey, status: newStatus });
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const completionRate = survey && survey.responseCount > 0
    ? Math.round((responses.length / survey.responseCount) * 100)
    : responses.length > 0 ? 100 : 0;

  const tabs = [
    { id: "questions" as const, label: "Questions" },
    { id: "responses" as const, label: "Responses" },
  ];

  return (
    <ModuleLayoutShell moduleType="SURVEYS">
      <div className="p-6 bg-[var(--bg-base)] min-h-full">
        {loading ? (
          <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">Loading...</div>
        ) : !survey ? (
          <div className="text-center py-16">
            <p className="text-sm text-[var(--text-secondary)] mb-4">Survey not found.</p>
            <button onClick={() => router.push("/surveys")} className="text-sm text-[var(--accent)] hover:underline">Back to Surveys</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <button onClick={() => router.push("/surveys")} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  Back to Surveys
                </button>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{survey.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[survey.status] ?? "bg-gray-100 text-gray-600")}>
                    {survey.status}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">{responses.length} responses</span>
                  <span className="text-xs text-[var(--text-secondary)]">{completionRate}% completion</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => router.push(`/surveys/builder?id=${surveyId}`)}
                  className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                  Edit
                </button>
                <button onClick={copyShareLink}
                  className="px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                  {copied ? "Copied!" : "Share"}
                </button>
                {survey.status === "Active" && (
                  <button onClick={() => updateStatus("Closed")}
                    className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    Close
                  </button>
                )}
                {survey.status === "Draft" && (
                  <button onClick={() => updateStatus("Active")}
                    className="px-3 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
                    Activate
                  </button>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Questions</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{survey.questions.length}</p>
              </div>
              <div className="border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Responses</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{responses.length}</p>
              </div>
              <div className="border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Completion Rate</p>
                <p className="text-xl font-bold text-emerald-600">{completionRate}%</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn("px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                    tab === t.id ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
                  )}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Questions Tab */}
            {tab === "questions" && (
              <div className="space-y-3">
                {survey.questions.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">No questions in this survey.</p>
                ) : (
                  survey.questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 border border-[var(--border)] rounded-lg p-4">
                      <span className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5 w-5">{i + 1}.</span>
                      <svg className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_ICONS[q.type] ?? TYPE_ICONS.text} />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{q.text}</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Type: {q.type}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {q.options.map((opt, j) => (
                              <span key={j} className="px-2 py-0.5 text-xs bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded">{opt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Responses Tab */}
            {tab === "responses" && (
              responses.length === 0 ? (
                <div className="text-center py-12 border border-[var(--border)] rounded-xl">
                  <p className="text-sm text-[var(--text-secondary)] mb-1">No responses yet</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Responses will appear once participants submit the survey.</p>
                </div>
              ) : (
                <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[var(--bg-base)]">
                        <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Respondent</th>
                        {survey.questions.slice(0, 4).map((q, i) => (
                          <th key={i} className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3 truncate max-w-[150px]">{q.text}</th>
                        ))}
                        <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {responses.map((r, i) => (
                        <tr key={i} className="hover:bg-[var(--bg-hover)]">
                          <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{r.respondent ?? `Respondent ${i + 1}`}</td>
                          {survey.questions.slice(0, 4).map((q, j) => (
                            <td key={j} className="px-4 py-3 text-sm text-[var(--text-secondary)] truncate max-w-[150px]">
                              {String(r.answers[q.text] ?? "-")}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-xs text-[var(--text-tertiary)]">
                            {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "-"}
                          </td>
                        </tr>
                      ))}
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
