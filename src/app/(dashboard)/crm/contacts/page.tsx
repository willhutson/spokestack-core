"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { CrmNav } from "../CrmNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContactEntry {
  id: string;
  key: string;
  value: {
    name: string;
    email?: string;
    company?: string;
    type?: string;
    phone?: string;
    status?: string;
  };
  createdAt: string;
}

const TYPE_OPTIONS = ["customer", "lead", "prospect"] as const;

const TYPE_COLORS: Record<string, string> = {
  customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lead: "bg-amber-50 text-amber-700 border-amber-200",
  prospect: "bg-blue-50 text-blue-700 border-blue-200",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)]",
  churned: "bg-red-50 text-red-600 border-red-200",
};

/* ------------------------------------------------------------------ */
/*  Add Contact Form                                                   */
/* ------------------------------------------------------------------ */
function AddContactForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState("customer");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Name is required.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/crm/contacts", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          company: company.trim() || undefined,
          type,
          phone: phone.trim() || undefined,
          status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErr(data?.error || `Failed: ${res.statusText}`);
        return;
      }
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">New Contact</h2>
        <button
          onClick={onCancel}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Company
            </label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Phone
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+971..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          {err && <p className="text-xs text-red-600 mr-auto">{err}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add Contact"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(
        `/api/v1/crm/contacts?${params.toString()}`,
        { headers }
      );
      if (res.ok) {
        setContacts((await res.json()).entries ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <ModuleLayoutShell moduleType="CRM">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Contacts</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Manage your leads, prospects, and customers.
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>New Contact</Button>
          )}
        </div>

        <CrmNav />

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {showForm && (
          <AddContactForm
            onCreated={() => {
              setShowForm(false);
              loadContacts();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="px-5 py-4 flex items-center gap-6 border-b border-[var(--border)] last:border-b-0"
              >
                <div className="h-4 w-32 bg-[var(--bg-surface)] rounded" />
                <div className="h-4 w-40 bg-[var(--bg-surface)] rounded" />
                <div className="h-5 w-16 bg-[var(--bg-surface)] rounded-full ml-auto" />
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
              No contacts found
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              {search || typeFilter
                ? "Try adjusting your filters."
                : "Add your first contact to get started."}
            </p>
            {!search && !typeFilter && (
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Add Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-base)]">
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">
                    Company
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--bg-hover)]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--accent)]">
                          {c.key.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {c.key}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                      {c.value.email || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                      {c.value.company || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          TYPE_COLORS[c.value.type || "customer"]
                        )}
                      >
                        {c.value.type || "customer"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          STATUS_COLORS[c.value.status || "active"]
                        )}
                      >
                        {c.value.status || "active"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
