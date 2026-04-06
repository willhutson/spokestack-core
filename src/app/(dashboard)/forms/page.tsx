"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { FormsNav } from "./FormsNav";
import { cn } from "@/lib/utils";

interface FormEntry {
  id: string;
  value: {
    name?: string;
    fields?: unknown[];
    status?: string;
    responseCount?: number;
    createdAt?: string;
  };
  updatedAt?: string;
  createdAt: string;
}

function statusBadge(status: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-600";
  if (status === "CLOSED") return "bg-red-50 text-red-600";
  return "bg-gray-100 text-gray-600";
}

export default function FormsListPage() {
  const [forms, setForms] = useState<FormEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadForms = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/forms", { headers });
      if (res.ok) {
        const data = await res.json();
        setForms(data.entries ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadForms(); }, [loadForms]);

  async function duplicateForm(form: FormEntry) {
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/forms", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.value.name ?? "Form"} (Copy)`,
          fields: form.value.fields ?? [],
          status: "DRAFT",
        }),
      });
      await loadForms();
    } catch { /* ignore */ }
  }

  async function deleteForm(formId: string) {
    setDeleting(formId);
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/v1/context/${formId}`, {
        method: "DELETE",
        headers,
      });
      setForms((prev) => prev.filter((f) => f.id !== formId));
    } catch { /* ignore */ } finally { setDeleting(null); }
  }

  return (
    <ModuleLayoutShell moduleType="SURVEYS">
      <div className="p-6">
        <FormsNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">All Forms</h1>
            <p className="text-sm text-gray-500 mt-0.5">{forms.length} form{forms.length !== 1 ? "s" : ""}</p>
          </div>
          <Link href="/forms/builder" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
            New Form
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-xl p-5">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No forms yet</h3>
            <p className="text-xs text-gray-500 mb-4">Create your first form to start collecting responses.</p>
            <Link href="/forms/builder" className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              Create Form
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {forms.map((form) => {
              const v = form.value;
              const fieldCount = v.fields?.length ?? 0;
              const status = v.status ?? "DRAFT";
              const edited = form.updatedAt ?? form.createdAt;
              return (
                <div key={form.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{v.name ?? "Untitled Form"}</h3>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2", statusBadge(status))}>{status}</span>
                  </div>
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Fields</span>
                      <span className="text-gray-600">{fieldCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Responses</span>
                      <span className="text-gray-600">{v.responseCount ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Last Edited</span>
                      <span className="text-gray-600">{edited ? new Date(edited).toLocaleDateString() : "--"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-gray-100 pt-3">
                    <Link href="/forms/builder" className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">Edit</Link>
                    <Link href="/forms/responses" className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors">Responses</Link>
                    <button onClick={() => duplicateForm(form)} className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors">Duplicate</button>
                    <button onClick={() => deleteForm(form.id)} disabled={deleting === form.id} className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50 transition-colors">
                      {deleting === form.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
