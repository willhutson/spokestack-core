"use client";

import { useState } from "react";

interface MarketplaceModule {
  id: string;
  name: string;
  description: string;
  price: number;
  agentName: string;
  category: string;
  installed: boolean;
}

const MODULES: MarketplaceModule[] = [
  {
    id: "crm",
    name: "CRM",
    description: "Customer relationship management with contact tracking, deal pipelines, and interaction history.",
    price: 9,
    agentName: "CRM Agent",
    category: "Sales",
    installed: false,
  },
  {
    id: "social-publishing",
    name: "Social Publishing",
    description: "Schedule and publish content across social platforms. Manage your content calendar in one place.",
    price: 7,
    agentName: "Publishing Agent",
    category: "Marketing",
    installed: false,
  },
  {
    id: "content-studio",
    name: "Content Studio",
    description: "AI-assisted content creation for blog posts, emails, ad copy, and social media captions.",
    price: 12,
    agentName: "Content Agent",
    category: "Marketing",
    installed: false,
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Business intelligence dashboards, custom reports, and automated insights from your data.",
    price: 10,
    agentName: "Analytics Agent",
    category: "Intelligence",
    installed: false,
  },
  {
    id: "surveys",
    name: "Surveys",
    description: "Create and distribute surveys, collect responses, and analyze feedback with AI summaries.",
    price: 5,
    agentName: "Survey Agent",
    category: "Feedback",
    installed: false,
  },
  {
    id: "email-campaigns",
    name: "Email Campaigns",
    description: "Design, send, and track email campaigns with segmentation and A/B testing.",
    price: 8,
    agentName: "Email Agent",
    category: "Marketing",
    installed: false,
  },
  {
    id: "invoicing",
    name: "Invoicing",
    description: "Professional invoicing with payment tracking, recurring billing, and financial reports.",
    price: 10,
    agentName: "Finance Agent",
    category: "Finance",
    installed: false,
  },
  {
    id: "hr-people",
    name: "HR & People",
    description: "Team management, time-off tracking, performance reviews, and employee onboarding.",
    price: 12,
    agentName: "HR Agent",
    category: "Operations",
    installed: false,
  },
  {
    id: "helpdesk",
    name: "Helpdesk",
    description: "Customer support ticketing, knowledge base, and automated response suggestions.",
    price: 8,
    agentName: "Support Agent",
    category: "Support",
    installed: false,
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Stock management, reorder alerts, supplier tracking, and warehouse organization.",
    price: 15,
    agentName: "Inventory Agent",
    category: "Operations",
    installed: false,
  },
  {
    id: "contracts",
    name: "Contracts",
    description: "Contract drafting, e-signatures, renewal tracking, and clause library.",
    price: 10,
    agentName: "Legal Agent",
    category: "Legal",
    installed: false,
  },
  {
    id: "scheduling",
    name: "Scheduling",
    description: "Appointment booking, calendar sync, automated reminders, and availability management.",
    price: 5,
    agentName: "Scheduling Agent",
    category: "Operations",
    installed: false,
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(MODULES.map((m) => m.category)))];

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [installedModules, setInstalledModules] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState<string | null>(null);

  const filtered = MODULES.filter((m) => {
    const matchesSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || m.category === category;
    return matchesSearch && matchesCategory;
  });

  async function handleInstall(moduleId: string) {
    setInstalling(moduleId);
    try {
      const res = await fetch("/api/v1/marketplace/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      });
      if (res.ok) {
        setInstalledModules((prev) => new Set([...prev, moduleId]));
      }
    } catch {
      // handle error
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Extend your workspace with modules. Every module ships with its own AI agent.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                category === cat
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((mod) => {
          const isInstalled = installedModules.has(mod.id);
          const isInstalling = installing === mod.id;

          return (
            <div
              key={mod.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <span className="text-indigo-600 text-sm font-bold">
                    {mod.name.charAt(0)}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {mod.category}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-1">{mod.name}</h3>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">{mod.description}</p>

              <div className="flex items-center gap-1.5 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-gray-500">{mod.agentName}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-sm font-semibold text-gray-900">
                  ${mod.price}<span className="text-xs font-normal text-gray-400">/mo</span>
                </span>
                {isInstalled ? (
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-md">
                    Installed
                  </span>
                ) : (
                  <button
                    onClick={() => handleInstall(mod.id)}
                    disabled={isInstalling}
                    className="text-xs font-medium text-white bg-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isInstalling ? "Installing..." : "Install"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No modules match your search.</p>
        </div>
      )}
    </div>
  );
}
