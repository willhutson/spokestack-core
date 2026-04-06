"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { FormsNav } from "../FormsNav";
import { cn } from "@/lib/utils";

interface FormEntry {
  id: string;
  value: {
    name?: string;
    fields?: unknown[];
    status?: string;
    responseCount?: number;
  };
  createdAt: string;
}

interface ResponseEntry {
  id: string;
  value: {
    formId?: string;
    respondent?: string;
    completionStatus?: string;
    responses?: Record<string, unknown>;
    submittedAt?: string;
  };
  createdAt: string;
}

export default function FormResponsesPage() {
  const [forms, setForms] = useState<FormEntry[]>([]);
  const [responses, setResponses] = useState<ResponseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [formRes, respRes] = await Promise.all([
        fetch("/api/v1/forms", { headers }),
        fetch("/api/v1/context?category=form_response", { headers }),
      ]);
      if (formRes.ok) {
        const data = await formRes.json();
        const entries = data.entries ?? [];
        setForms(entries);
        if (entries.length > 0 && !selectedFormId) {
          setSelectedFormId(entries[0].id);
        }
      }
      if (respRes.ok) {
        const data = await respRes.json();
        setResponses(data.entries ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [selectedFormId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredResponses = useMemo(() => {
    if (!selectedFormId) return responses;
    return responses.filter((r) => r.value.formId === selectedFormId);
  }, [responses, selectedFormId]);

  const stats = useMemo(() => {
    const total = filteredResponses.length;
    const completed = filteredResponses.filter((r) => r.value.completionStatus === "complete").length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate };
  }, [filteredResponses]);

  function exportCsv() {
    // Placeholder: generate CSV from responses
    const headers = ["Submitted At", "Respondent", "Status"];
    const rows = filteredResponses.map((r) => [
      r.value.submittedAt ?? r.createdAt,
      r.value.respondent ?? "Anonymous",
      r.value.completionStatus ?? "unknown",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form-responses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ModuleLayoutShell moduleType="SURVEYS">
      <div className="p-6">
        <FormsNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Responses</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">View and analyze form submissions</p>
          </div>
          <button onClick={exportCsv} disabled={filteredResponses.length === 0} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-colors">
            Export CSV
          </button>
        </div>

        {/* Form Selector */}
        <div className="flex items-center gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Select Form</label>
            <select value={selectedFormId ?? ""} onChange={(e) => setSelectedFormId(e.target.value || null)} className="h-9 px-3 text-sm border border-[var(--border-strong)] rounded-lg bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] min-w-[200px]">
              <option value="">All Forms</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.value.name ?? "Untitled"}</option>)}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Responses</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
          </div>
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Completed</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.completed}</p>
          </div>
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Completion Rate</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.rate}%</p>
          </div>
        </div>

        {/* Response Table */}
        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center text-sm text-[var(--text-tertiary)]">Loading...</div>
        ) : filteredResponses.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No responses yet</h3>
            <p className="text-xs text-[var(--text-secondary)]">Responses will appear here once people submit your form.</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Submitted At</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Respondent</th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredResponses.map((resp) => {
                  const v = resp.value;
                  const isExpanded = expandedRow === resp.id;
                  return (
                    <>
                      <tr key={resp.id} className="hover:bg-[var(--bg-hover)] cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : resp.id)}>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{v.submittedAt ? new Date(v.submittedAt).toLocaleString() : new Date(resp.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{v.respondent ?? "Anonymous"}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            v.completionStatus === "complete" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {v.completionStatus ?? "unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-[var(--accent)] font-medium">{isExpanded ? "Hide" : "View"}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${resp.id}-detail`}>
                          <td colSpan={4} className="px-4 py-4 bg-[var(--bg-base)]">
                            {v.responses ? (
                              <div className="space-y-2">
                                {Object.entries(v.responses).map(([key, val]) => (
                                  <div key={key} className="flex items-start gap-3">
                                    <span className="text-xs font-medium text-[var(--text-secondary)] min-w-[120px]">{key}</span>
                                    <span className="text-xs text-[var(--text-primary)]">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[var(--text-tertiary)]">No detailed responses available.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
