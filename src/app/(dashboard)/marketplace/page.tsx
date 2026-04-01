"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import ModuleCard from "@/components/marketplace/ModuleCard";

interface RegistryModule {
  moduleType: string;
  name: string;
  description: string;
  category: string;
  minTier: string;
  price: number | null;
  agentName: string;
  surfaces: string[];
}

interface InstalledModule {
  moduleType: string;
  active: boolean;
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "core", label: "Core" },
  { key: "marketing", label: "Marketing" },
  { key: "ops", label: "Operations" },
  { key: "analytics", label: "Analytics" },
];

export default function MarketplacePage() {
  const [modules, setModules] = useState<RegistryModule[]>([]);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        loadModules(session.access_token);
      }
    });
  }, []);

  async function loadModules(accessToken: string) {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [allRes, installedRes] = await Promise.all([
      fetch("/api/v1/modules").then((r) => r.json()),
      fetch("/api/v1/modules/installed", { headers }).then((r) => r.json()),
    ]);

    setModules(allRes.modules ?? []);
    setInstalled(
      new Set(
        (installedRes.installed ?? [])
          .filter((m: InstalledModule) => m.active)
          .map((m: InstalledModule) => m.moduleType)
      )
    );
  }

  async function handleInstall(moduleType: string) {
    if (!token) return;
    setInstalling(moduleType);

    try {
      const res = await fetch("/api/v1/modules/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ moduleType }),
      });

      if (res.ok) {
        setInstalled((prev) => new Set([...prev, moduleType]));
      } else {
        const data = await res.json();
        alert(data.error || "Install failed");
      }
    } catch {
      alert("Install failed — please try again.");
    } finally {
      setInstalling(null);
    }
  }

  const filtered = modules.filter((m) => {
    if (category !== "all" && m.category !== category) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse and install agent-powered modules
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              category === cat.key
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <ModuleCard
            key={m.moduleType}
            moduleType={m.moduleType}
            name={m.name}
            description={m.description}
            category={m.category}
            minTier={m.minTier}
            price={m.price}
            agentName={m.agentName}
            installed={installed.has(m.moduleType)}
            installing={installing === m.moduleType}
            onInstall={() => handleInstall(m.moduleType)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">
            No modules match your search.
          </p>
        </div>
      )}
    </div>
  );
}
