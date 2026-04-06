"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { cn } from "@/lib/utils";
import { SurveysNav } from "../SurveysNav";

interface ContextEntry {
  id: string;
  category: string;
  key: string;
  value: string;
  updatedAt: string;
}

interface SurveyData {
  key: string;
  title: string;
  questions: { text: string; type: string }[];
  status: string;
  responseCount: number;
}

interface ResponseData {
  surveyKey: string;
  answers: Record<string, string | number>;
}

export default function SurveyAnalyticsPage() {
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [sRes, rRes] = await Promise.all([
        fetch("/api/v1/context?category=survey", { headers }),
        fetch("/api/v1/context?category=survey_response", { headers }),
      ]);
      if (sRes.ok) {
        const d = await sRes.json();
        const parsed: SurveyData[] = (d.entries ?? []).map((e: ContextEntry) => {
          try {
            const v = JSON.parse(e.value);
            return { key: e.key, title: v.title ?? e.key, questions: v.questions ?? [], status: v.status ?? "Draft", responseCount: v.responseCount ?? 0 };
          } catch {
            return { key: e.key, title: e.key, questions: [], status: "Draft", responseCount: 0 };
          }
        });
        setSurveys(parsed);
        if (parsed.length > 0 && !selectedSurvey) setSelectedSurvey(parsed[0].key);
      }
      if (rRes.ok) {
        const d = await rRes.json();
        setResponses((d.entries ?? []).map((e: ContextEntry) => {
          try {
            const v = JSON.parse(e.value);
            return { surveyKey: v.surveyKey ?? "", answers: v.answers ?? {} };
          } catch {
            return { surveyKey: "", answers: {} };
          }
        }));
      }
    } catch {
      // API unavailable
    } finally {
      setLoading(false);
    }
  }, [selectedSurvey]);

  useEffect(() => { load(); }, [load]);

  const survey = surveys.find((s) => s.key === selectedSurvey);
  const surveyResponses = responses.filter((r) => r.surveyKey === selectedSurvey);
  const totalResponses = surveyResponses.length;
  const completionRate = survey && survey.responseCount > 0
    ? Math.round((totalResponses / survey.responseCount) * 100)
    : totalResponses > 0 ? 100 : 0;

  return (
    <ModuleLayoutShell moduleType="SURVEYS">
      <div className="p-6 bg-white min-h-full">
        <SurveysNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Survey Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Performance insights for your surveys.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-16 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">No surveys yet</p>
            <p className="text-xs text-gray-400">Create a survey to see analytics here.</p>
          </div>
        ) : (
          <>
            {/* Survey Selector */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-500 mb-1">Select Survey</label>
              <select
                value={selectedSurvey}
                onChange={(e) => setSelectedSurvey(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
              >
                {surveys.map((s) => (
                  <option key={s.key} value={s.key}>{s.title}</option>
                ))}
              </select>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-medium text-gray-500 mb-1">Total Responses</p>
                <p className="text-2xl font-bold text-gray-900">{totalResponses}</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-medium text-gray-500 mb-1">Completion Rate</p>
                <p className="text-2xl font-bold text-emerald-600">{completionRate}%</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-medium text-gray-500 mb-1">Avg Completion Time</p>
                <p className="text-2xl font-bold text-gray-900">--</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Not yet tracked</p>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Question Breakdown</h3>
              {survey && survey.questions.length > 0 ? (
                <div className="space-y-3">
                  {survey.questions.map((q, i) => {
                    const qResponses = surveyResponses.filter((r) => q.text in r.answers).length;
                    return (
                      <div key={i} className="flex items-center gap-4 border border-gray-200 rounded-lg p-4">
                        <span className="text-xs font-medium text-gray-400 w-6">Q{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{q.text}</p>
                        </div>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium",
                          "bg-gray-100 text-gray-600"
                        )}>{q.type}</span>
                        <span className="text-sm font-medium text-gray-700 w-20 text-right">{qResponses} responses</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No questions in this survey.</p>
              )}
            </div>

            {/* Response Timeline Placeholder */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Response Timeline</h3>
              <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-xs text-gray-400">Timeline visualization coming soon</p>
              </div>
            </div>
          </>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
