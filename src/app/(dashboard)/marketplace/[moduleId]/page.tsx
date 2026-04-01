"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import DemoSandbox from "@/components/marketplace/DemoSandbox";
import { MODULE_DEMOS } from "@/lib/marketplace/demo-data";

interface ModuleInfo {
  moduleType: string;
  name: string;
  description: string;
  category: string;
  minTier: string;
  price: number | null;
  agentName: string;
}

export default function MarketplaceModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = (params.moduleId as string).toUpperCase();

  const [module, setModule] = useState<ModuleInfo | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const demo = MODULE_DEMOS[moduleId] ?? null;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      const headers = { Authorization: `Bearer ${session.access_token}` };

      Promise.all([
        fetch("/api/v1/modules").then((r) => r.json()),
        fetch("/api/v1/modules/installed", { headers }).then((r) => r.json()),
      ])
        .then(([allData, installedData]) => {
          const allModules = allData.modules ?? [];
          const found = allModules.find(
            (m: ModuleInfo) => m.moduleType === moduleId
          );
          setModule(found ?? null);

          const installed = installedData.installed ?? [];
          setIsInstalled(
            installed.some(
              (m: { moduleType: string; active: boolean }) =>
                m.moduleType === moduleId && m.active
            )
          );
        })
        .finally(() => setIsLoading(false));
    });
  }, [moduleId]);

  async function handleInstall() {
    if (!token) return;
    setIsInstalling(true);
    try {
      const res = await fetch("/api/v1/modules/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ moduleType: moduleId }),
      });
      if (res.ok) setIsInstalled(true);
    } finally {
      setIsInstalling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-96" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/marketplace")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back to Marketplace
      </button>

      {/* Module info */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-semibold text-gray-900">
            {module?.name ?? demo?.label ?? moduleId}
          </h1>
          {isInstalled && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Installed
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {module?.description ?? demo?.description ?? ""}
        </p>
        {module && (
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span>Category: {module.category}</span>
            <span>Min tier: {module.minTier}</span>
            {module.price ? (
              <span>
                ${(module.price / 100).toFixed(0)}/mo
              </span>
            ) : (
              <span>Included in tier</span>
            )}
            <span>Agent: {module.agentName}</span>
          </div>
        )}
      </div>

      {/* Demo sandbox */}
      {demo && (
        <DemoSandbox
          demo={demo}
          isInstalled={isInstalled}
          onInstall={!isInstalled ? handleInstall : undefined}
        />
      )}

      {/* Install button (no demo) */}
      {!demo && !isInstalled && (
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          className="w-full rounded-xl bg-indigo-600 text-white font-medium py-3 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isInstalling ? "Installing..." : "Install Module \u2192"}
        </button>
      )}

      {/* Installed confirmation */}
      {isInstalled && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <svg
            className="w-5 h-5 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <span className="text-sm font-medium text-emerald-700">
              Module active
            </span>
            <p className="text-xs text-emerald-600 mt-0.5">
              This module is installed and its agent is available in your
              workspace.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
