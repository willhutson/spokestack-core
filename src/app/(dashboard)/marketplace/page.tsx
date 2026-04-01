"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import ModuleCard from "@/components/marketplace/ModuleCard";
import { MODULE_DEMOS } from "@/lib/marketplace/demo-data";

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
  { key: "enterprise", label: "Enterprise" },
];

function hasDemo(moduleType: string): boolean {
  return !!MODULE_DEMOS[moduleType.toUpperCase()];
}

export default function MarketplacePage() {
  const router = useRouter();
  const [modules, setModules] = useState<RegistryModule[]>([]);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [installedStatus, setInstalledStatus] = useState<"loaded" | "failed" | "pending">("pending");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [uninstalling, setUninstalling] = useState<string | null>(null);
  const [registryError, setRegistryError] = useState<string | null>(null);

  useEffect(() => {
    loadModules();
  }, []);

  async function loadModules() {
    const headers = await getAuthHeaders();

    // Fetch registry independently
    try {
      const res = await fetch("/api/v1/modules");
      if (!res.ok) throw new Error(`Registry fetch failed: ${res.status}`);
      const allRes = await res.json();
      setModules(allRes.modules ?? []);
    } catch (err) {
      console.error("Failed to fetch module registry:", err);
      setRegistryError("Failed to load modules. Please try again later.");
    }

    // Fetch installed independently
    try {
      const res = await fetch("/api/v1/modules/installed", { headers });
      if (!res.ok) throw new Error(`Installed fetch failed: ${res.status}`);
      const installedRes = await res.json();
      setInstalled(
        new Set(
          (installedRes.installed ?? [])
            .filter((m: InstalledModule) => m.active)
            .map((m: InstalledModule) => m.moduleType)
        )
      );
      setInstalledStatus("loaded");
    } catch (err) {
      console.error("Failed to fetch installed modules:", err);
      setInstalledStatus("failed");
    }
  }

  async function handleInstall(moduleType: string) {
    setInstalling(moduleType);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/modules/install", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ moduleType }),
      });

      if (res.ok) {
        setInstalled((prev) => new Set([...prev, moduleType]));
      } else {
        const data = await res.json();
        alert(data.error || "Install failed");
      }
    } catch {
      alert("Install failed -- please try again.");
    } finally {
      setInstalling(null);
    }
  }

  async function handleUninstall(moduleType: string) {
    setUninstalling(moduleType);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/modules/uninstall", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ moduleType }),
      });

      if (res.ok) {
        setInstalled((prev) => {
          const next = new Set(prev);
          next.delete(moduleType);
          return next;
        });
      } else {
        const data = await res.json();
        alert(data.error || "Uninstall failed");
      }
    } catch {
      alert("Uninstall failed -- please try again.");
    } finally {
      setUninstalling(null);
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

      {/* Installed status warning */}
      {installedStatus === "failed" && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          Could not load install status. Module availability may be inaccurate.
        </div>
      )}

      {/* Registry error */}
      {registryError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {registryError}
        </div>
      )}

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => {
          const isInstalled = installedStatus === "failed" ? false : installed.has(m.moduleType);
          return (
            <div
              key={m.moduleType}
              className="relative cursor-pointer"
              onClick={() => router.push(`/marketplace/${m.moduleType}`)}
            >
              {hasDemo(m.moduleType) && (
                <span className="absolute top-3 right-3 z-10 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                  Preview
                </span>
              )}
              <ModuleCard
                moduleType={m.moduleType}
                name={m.name}
                description={m.description}
                category={m.category}
                minTier={m.minTier}
                price={m.price}
                agentName={m.agentName}
                installed={isInstalled}
                installing={installing === m.moduleType}
                onInstall={() => {
                  if (isInstalled) {
                    handleUninstall(m.moduleType);
                  } else {
                    handleInstall(m.moduleType);
                  }
                }}
              />
              {isInstalled && uninstalling !== m.moduleType && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUninstall(m.moduleType);
                  }}
                  className="absolute bottom-5 right-5 text-[10px] font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md hover:bg-red-100 transition-colors z-10"
                >
                  Uninstall
                </button>
              )}
              {uninstalling === m.moduleType && (
                <div className="absolute bottom-5 right-5 text-[10px] font-medium text-gray-400 px-2 py-1 z-10">
                  Removing...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!registryError && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">
            No modules match your search.
          </p>
        </div>
      )}
    </div>
  );
}
