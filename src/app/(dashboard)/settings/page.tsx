"use client";

import { useState } from "react";

interface OrgSettings {
  name: string;
  timezone: string;
  language: string;
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

const INTEGRATIONS: Integration[] = [
  { id: "slack", name: "Slack", connected: false, icon: "S" },
  { id: "google-drive", name: "Google Drive", connected: false, icon: "G" },
  { id: "notion", name: "Notion", connected: false, icon: "N" },
  { id: "figma", name: "Figma", connected: false, icon: "F" },
  { id: "github", name: "GitHub", connected: false, icon: "H" },
  { id: "whatsapp", name: "WhatsApp", connected: false, icon: "W" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "billing" | "team" | "integrations">("general");
  const [org, setOrg] = useState<OrgSettings>({
    name: "My Workspace",
    timezone: "UTC",
    language: "en",
  });
  const [saving, setSaving] = useState(false);
  const [teamMembers] = useState<TeamMember[]>([
    { id: "1", name: "You", email: "user@example.com", role: "owner" },
  ]);
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  async function handleSaveOrg() {
    setSaving(true);
    try {
      await fetch("/api/v1/settings/org", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(org),
      });
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleIntegration(integrationId: string) {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === integrationId ? { ...int, connected: !int.connected } : int
      )
    );
    try {
      await fetch(`/api/v1/settings/integrations/${integrationId}`, {
        method: "POST",
      });
    } catch {
      // revert on error
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === integrationId ? { ...int, connected: !int.connected } : int
        )
      );
    }
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
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
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

            <div className="pt-2">
              <button
                onClick={handleSaveOrg}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Current Plan</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">Free</p>
                <p className="text-xs text-gray-500 mt-0.5">Up to 3 members, Tasks Agent only</p>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors">
                Upgrade
              </button>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available Plans</h4>
              {[
                { name: "Starter", price: "$29/mo", features: "10 members, + Projects Agent" },
                { name: "Pro", price: "$59/mo", features: "25 members, + Briefs Agent, 3 marketplace modules" },
                { name: "Business", price: "$149/mo", features: "50 members, + Orders Agent, unlimited modules" },
              ].map((plan) => (
                <div key={plan.name} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{plan.name}</span>
                    <span className="text-sm text-gray-500 ml-2">{plan.price}</span>
                    <p className="text-xs text-gray-400">{plan.features}</p>
                  </div>
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
              <p className="text-xs text-gray-500">{teamMembers.length} of 3 seats used</p>
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
            </div>
          </div>
        </div>
      )}

      {/* Integrations */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Connect your favorite tools. Integrations give your agents additional context.
          </p>
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
                  onClick={() => handleToggleIntegration(int.id)}
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
          </div>
        </div>
      )}
    </div>
  );
}
