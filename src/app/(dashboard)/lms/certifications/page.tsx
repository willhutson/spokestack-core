"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { LmsNav } from "../LmsNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface Certification {
  id: string;
  key: string;
  value: {
    name: string;
    issuer: string;
    dateEarned: string;
    expiryDate: string;
    status: string;
  };
  createdAt: string;
}

function computeStatus(expiryDate: string): string {
  if (!expiryDate) return "VALID";
  const expiry = new Date(expiryDate);
  const now = new Date();
  if (expiry < now) return "EXPIRED";
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 90) return "EXPIRING_SOON";
  return "VALID";
}

const statusColors: Record<string, string> = {
  VALID: "bg-green-100 text-green-700",
  EXPIRING_SOON: "bg-yellow-100 text-yellow-700",
  EXPIRED: "bg-red-100 text-red-700",
};

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", issuer: "", dateEarned: "", expiryDate: "",
  });

  async function loadCerts() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/context?category=certification", { headers });
      const data = await res.json();
      setCertifications(data.entries || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCerts(); }, []);

  async function handleSubmit() {
    if (!form.name) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/context", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "ENTITY",
          category: "certification",
          key: form.name,
          value: {
            name: form.name,
            issuer: form.issuer,
            dateEarned: form.dateEarned,
            expiryDate: form.expiryDate,
            status: computeStatus(form.expiryDate),
          },
        }),
      });
      setForm({ name: "", issuer: "", dateEarned: "", expiryDate: "" });
      setShowForm(false);
      loadCerts();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModuleLayoutShell moduleType="LMS">
      <div className="p-6">
        <LmsNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Certifications</h1>
            <p className="text-sm text-[var(--text-secondary)]">Track and manage professional certifications.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[var(--accent)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:bg-[var(--accent)]"
          >
            {showForm ? "Cancel" : "Add Certification"}
          </button>
        </div>

        {showForm && (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">New Certification</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Certification Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Issuing Body" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} className="border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" />
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Date Earned</label>
                <input type="date" value={form.dateEarned} onChange={(e) => setForm({ ...form, dateEarned: e.target.value })} className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Expiry Date</label>
                <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={handleSubmit} disabled={saving || !form.name} className="px-4 py-2 bg-[var(--accent)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:bg-[var(--accent)] disabled:opacity-50">
                {saving ? "Saving..." : "Add Certification"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">Loading...</p>
        ) : certifications.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No certifications tracked yet. Add your first certification above.</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-base)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Certification</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Issuing Body</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Earned</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Expires</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certifications.map((cert) => {
                  const v = cert.value;
                  const status = computeStatus(v.expiryDate);
                  return (
                    <tr key={cert.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{v.name}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{v.issuer || "N/A"}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{v.dateEarned ? new Date(v.dateEarned).toLocaleDateString() : "N/A"}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{v.expiryDate ? new Date(v.expiryDate).toLocaleDateString() : "No expiry"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusColors[status])}>
                          {status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => console.log("Download certificate:", cert.id)}
                          className="text-xs text-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
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
