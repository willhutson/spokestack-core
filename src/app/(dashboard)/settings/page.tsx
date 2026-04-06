"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthHeaders } from "@/lib/client-auth";
import { Skeleton } from "@/components/ui/skeleton";
import BrandingSettingsPage from "./branding/page";

interface OrgSettings {
  name: string;
  timezone: string;
  language: string;
}

interface BillingInfo {
  tier: string;
  status: string;
  allTiers?: TierPlan[];
}

interface TierPlan {
  name: string;
  key: string;
  price: string;
  features: string;
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

const FALLBACK_PLANS: TierPlan[] = [
  { name: "Free", key: "FREE", price: "$0/mo", features: "3 members, Tasks module only" },
  { name: "Starter", key: "STARTER", price: "$29/mo", features: "10 members, + Projects Agent" },
  { name: "Pro", key: "PRO", price: "$59/mo", features: "25 members, + Briefs Agent, 3 marketplace modules" },
  { name: "Business", key: "BUSINESS", price: "$149/mo", features: "50 members, + Orders Agent, unlimited modules" },
  { name: "Enterprise", key: "ENTERPRISE", price: "Custom", features: "Unlimited members, all modules, dedicated support" },
];

function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "billing" | "team" | "integrations" | "branding">("general");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

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
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setOrgLoading(true);
    setOrgError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/settings", { headers });
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      setOrg({ name: data.name ?? "", timezone: data.timezone ?? "UTC", language: data.language ?? "en" });
    } catch (err) {
      console.error("Settings fetch error:", err);
      setOrgError("Failed to load organization settings.");
    } finally {
      setOrgLoading(false);
    }
  }, []);

  const fetchBilling = useCallback(async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/billing", { headers });
      if (!res.ok) throw new Error("Failed to load billing");
      const data = await res.json();
      setBilling({
        tier: data.tier ?? "FREE",
        status: data.status ?? "active",
        allTiers: data.allTiers ?? undefined,
      });
    } catch (err) {
      console.error("Billing fetch error:", err);
      setBillingError("Failed to load billing information.");
    } finally {
      setBillingLoading(false);
    }
  }, []);

  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/members", { headers });
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

  const fetchIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    setIntegrationsError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/integrations", { headers });
      if (!res.ok) throw new Error("Failed to load integrations");
      const data = await res.json();
      setIntegrations(data.integrations ?? data.connections ?? []);
    } catch (err) {
      console.error("Integrations fetch error:", err);
      setIntegrationsError("Failed to load integrations.");
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get current user email
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
      }
    });

    fetchSettings();
    fetchBilling();
    fetchTeam();
    fetchIntegrations();
  }, [fetchSettings, fetchBilling, fetchTeam, fetchIntegrations]);

  async function handleSaveOrg() {
    if (!org) return;
    setSaving(true);
    setSaveSuccess(false);
    setOrgError(null);
    try {
      const headers = await getAuthHeaders();
      const jsonHeaders = { ...headers, "Content-Type": "application/json" };

      // Save settings (timezone, language)
      const settingsRes = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ timezone: org.timezone, language: org.language }),
      });
      if (!settingsRes.ok) throw new Error("Failed to save settings");

      // Save org name separately
      const orgRes = await fetch("/api/v1/org", {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({ name: org.name }),
      });
      if (!orgRes.ok) throw new Error("Failed to save org name");

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setOrgError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConnect(integrationId: string) {
    setConnectingId(integrationId);
    window.open(`/api/v1/integrations/connect?provider=${integrationId}`, "_blank", "width=600,height=700");
    // Re-fetch after a delay to pick up connection changes
    setTimeout(() => {
      fetchIntegrations();
      setConnectingId(null);
    }, 2000);
  }

  async function handleDisconnect(integrationId: string) {
    setConnectingId(integrationId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/integrations/disconnect`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ provider: integrationId }),
      });
      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((i) => (i.id === integrationId ? { ...i, connected: false } : i))
        );
      }
    } catch {
      // Silently fail, user can retry
    } finally {
      setConnectingId(null);
    }
  }

  const planCards = billing?.allTiers ?? FALLBACK_PLANS;

  const TABS = [
    { key: "general" as const, label: "General" },
    { key: "branding" as const, label: "Branding" },
    { key: "billing" as const, label: "Billing" },
    { key: "team" as const, label: "Team" },
    { key: "integrations" as const, label: "Integrations" },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] mb-6">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 space-y-5">
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
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 space-y-5">
              {orgError && <ErrorMsg message={orgError} />}
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Organization Name
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={org.name}
                  onChange={(e) => setOrg({ ...org, name: e.target.value })}
                  className="w-full max-w-md border border-[var(--border-strong)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="org-tz" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Timezone
                </label>
                <select
                  id="org-tz"
                  value={org.timezone}
                  onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
                  className="w-full max-w-md border border-[var(--border-strong)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="org-lang" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Language
                </label>
                <select
                  id="org-lang"
                  value={org.language}
                  onChange={(e) => setOrg({ ...org, language: e.target.value })}
                  className="w-full max-w-md border border-[var(--border-strong)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
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
                  className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
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
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-48" />
            </div>
          ) : billingError ? (
            <ErrorMsg message={billingError} />
          ) : billing ? (
            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Current Plan</h3>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                    {billing.tier.charAt(0).toUpperCase() + billing.tier.slice(1).toLowerCase()}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Status: <span className="capitalize">{billing.status}</span>
                  </p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-md hover:bg-[var(--accent-hover)] transition-colors">
                  Upgrade
                </button>
              </div>

              <div className="border-t border-[var(--border)] pt-4 space-y-3">
                <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Available Plans</h4>
                {planCards.map((plan) => {
                  const planKey = plan.key ?? plan.name.toUpperCase();
                  const isCurrent = billing.tier.toUpperCase() === planKey.toUpperCase();
                  return (
                    <div
                      key={plan.name}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        isCurrent ? "bg-[var(--accent-subtle)] border border-[var(--accent)]" : ""
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{plan.name}</span>
                        <span className="text-sm text-[var(--text-secondary)] ml-2">{plan.price}</span>
                        <p className="text-xs text-[var(--text-tertiary)]">{plan.features}</p>
                      </div>
                      {isCurrent ? (
                        <span className="text-xs font-medium text-[var(--accent)]">Current</span>
                      ) : (
                        <button className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
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
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 space-y-4">
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
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Team Members</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}</p>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Invite Member
                </button>
              </div>

              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="divide-y divide-[var(--border)]">
                  {teamMembers.map((member) => {
                    const isYou = member.email === currentUserEmail;
                    return (
                      <div key={member.id} className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-sm font-medium text-[var(--accent)]">
                            {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {member.name || member.email}
                              {isYou && (
                                <span className="ml-1.5 text-xs font-normal text-[var(--text-tertiary)]">(you)</span>
                              )}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">{member.email}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2.5 py-1 rounded-full capitalize">
                          {member.role}
                        </span>
                      </div>
                    );
                  })}
                  {teamMembers.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">
                      No team members found.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Branding */}
      {activeTab === "branding" && (
        <BrandingSettingsPage />
      )}

      {/* Integrations */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <p className="text-sm text-[var(--text-secondary)]">
            Connect your favorite tools. Integrations give your agents additional context.
          </p>
          {integrationsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
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
                  className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)]">
                      {int.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{int.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {int.connected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {int.connected ? (
                    <button
                      onClick={() => handleDisconnect(int.id)}
                      disabled={connectingId === int.id}
                      className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                    >
                      {connectingId === int.id ? "..." : "Disconnect"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(int.id)}
                      disabled={connectingId === int.id}
                      className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors text-[var(--accent)] bg-[var(--accent-subtle)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
                    >
                      {connectingId === int.id ? "..." : "Connect"}
                    </button>
                  )}
                </div>
              ))}
              {integrations.length === 0 && (
                <div className="col-span-2 space-y-4">
                  <p className="text-center text-sm text-[var(--text-tertiary)] py-4">
                    No integrations connected yet. Connect tools to sync data with SpokeStack.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {["Google Drive", "Slack", "Asana", "HubSpot", "Xero", "Figma"].map((name) => (
                      <button
                        key={name}
                        onClick={() => handleConnect(name.toLowerCase().replace(/\s+/g, "-"))}
                        className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-3 text-sm hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />
                        <span className="text-[var(--text-primary)]">{name}</span>
                        <span className="ml-auto text-xs text-[var(--accent)]">Connect</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
