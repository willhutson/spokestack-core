"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrgSettings {
  name: string;
  timezone: string;
  language: string;
}

interface BillingInfo {
  tier: string;
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
}

interface Integration {
  id: string;
  name: string;
  connected: boolean;
  icon: string;
}

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata",
  "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
];

const PLANS = [
  { name: "Starter", price: "$29/mo", features: "10 members, + Projects Agent" },
  { name: "Pro", price: "$59/mo", features: "25 members, + Briefs Agent, 3 marketplace modules" },
  { name: "Business", price: "$149/mo", features: "50 members, + Orders Agent, unlimited modules" },
];

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "billing" | "team" | "integrations">("general");
  const [token, setToken] = useState<string | null>(null);

  // General state
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Billing state
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);

  const fetchSettings = useCallback(async (accessToken: string) => {
    setOrgLoading(true);
    setOrgError(null);
    try {
      const res = await fetch("/api/v1/settings", {
        headers: authHeaders(accessToken),
      });
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      setOrg({ name: data.name, timezone: data.timezone, language: data.language });
    } catch (err) {
      console.error("Settings fetch error:", err);
      setOrgError("Failed to load organization settings.");
    } finally {
      setOrgLoading(false);
    }
  }, []);

  const fetchBilling = useCallback(async (accessToken: string) => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/v1/billing", {
        headers: authHeaders(accessToken),
      });
      if (!res.ok) throw new Error("Failed to load billing");
      const data = await res.json();
      setBilling({ tier: data.tier, status: data.status });
    } catch (err) {
      console.error("Billing fetch error:", err);
      setBillingError("Failed to load billing information.");
    } finally {
      setBillingLoading(false);
    }
  }, []);

  const fetchTeam = useCallback(async (accessToken: string) => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const res = await fetch("/api/v1/members", {
        headers: authHeaders(accessToken),
      });
      if (!res.ok) throw new Error("Failed to load team members");
      const data = await res.json();
      setTeamMembers(data.members ?? []);
    } catch (err) {
      console.error("Team fetch error:", err);
      setTeamError("Failed to load team members.");
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const fetchIntegrations = useCallback(async (accessToken: string) => {
    setIntegrationsLoading(true);
    setIntegrationsError(null);
    try {
      const res = await fetch("/api/v1/integrations", {
        headers: authHeaders(accessToken),
      });
      if (!res.ok) throw new Error("Failed to load integrations");
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } catch (err) {
      console.error("Integrations fetch error:", err);
      setIntegrationsError("Failed to load integrations.");
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    getToken().then((t) => {
      if (!t) return;
      setToken(t);
      fetchSettings(t);
      fetchBilling(t);
      fetchTeam(t);
      fetchIntegrations(t);
    });
  }, [fetchSettings, fetchBilling, fetchTeam, fetchIntegrations]);

  async function handleSaveOrg() {
    if (!token || !org) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(org),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setOrgError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleConnect(integrationId: string) {
    window.open(`/api/v1/integrations/connect?provider=${integrationId}`, "_blank", "width=600,height=700");
  }

  const TABS = [
    { key: "general" as const, label: "General" },
    { key: "billing" as const, label: "Billing" },
    { key: "team" as const, label: "Team" },
    { key: "integrations" as const, label: "Integrations" },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {orgLoading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
          ) : orgError && !org ? (
            <ErrorMsg message={orgError} />
          ) : org ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              {orgError && <ErrorMsg message={orgError} />}
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={org.name}
                  onChange={(e) => setOrg({ ...org, name: e.target.value })}
                  className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="org-tz" className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  id="org-tz"
                  value={org.timezone}
                  onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
                  className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="org-lang" className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  id="org-lang"
                  value={org.language}
                  onChange={(e) => setOrg({ ...org, language: e.target.value })}
                  className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleSaveOrg}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                {saveSuccess && (
                  <span className="text-sm text-green-600">Saved successfully</span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Billing */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {billingLoading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-48" />
            </div>
          ) : billingError ? (
            <ErrorMsg message={billingError} />
          ) : billing ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Current Plan</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{billing.tier}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Status: <span className="capitalize">{billing.status}</span>
                  </p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">
                  Upgrade
                </button>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available Plans</h4>
                {PLANS.map((plan) => {
                  const isCurrent = billing.tier.toLowerCase() === plan.name.toLowerCase();
                  return (
                    <div
                      key={plan.name}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        isCurrent ? "bg-indigo-50 border border-indigo-200" : ""
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">{plan.name}</span>
                        <span className="text-sm text-gray-500 ml-2">{plan.price}</span>
                        <p className="text-xs text-gray-400">{plan.features}</p>
                      </div>
                      {isCurrent ? (
                        <span className="text-xs font-medium text-indigo-600">Current</span>
                      ) : (
                        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                          Select
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Team */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {teamLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : teamError ? (
            <ErrorMsg message={teamError} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
                  <p className="text-xs text-gray-500">{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}</p>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Invite Member
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-600">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full capitalize">
                        {member.role}
                      </span>
                    </div>
                  ))}
                  {teamMembers.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      No team members found.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Integrations */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Connect your favorite tools. Integrations give your agents additional context.
          </p>
          {integrationsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <Skeleton className="h-10 w-full mb-3" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : integrationsError ? (
            <ErrorMsg message={integrationsError} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {integrations.map((int) => (
                <div
                  key={int.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                      {int.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{int.name}</p>
                      <p className="text-xs text-gray-500">
                        {int.connected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConnect(int.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                      int.connected
                        ? "text-red-600 bg-red-50 hover:bg-red-100"
                        : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                    }`}
                  >
                    {int.connected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              ))}
              {integrations.length === 0 && (
                <div className="col-span-2 text-center py-8 text-sm text-gray-400">
                  No integrations available.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
