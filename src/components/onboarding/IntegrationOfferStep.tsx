"use client";

import { useState } from "react";
import { CheckCircle, Plug, ArrowRight, Loader2 } from "lucide-react";
import {
  INDUSTRY_INTEGRATIONS,
  INTEGRATION_METADATA,
} from "@/lib/onboarding/industry-integrations";
import { getAuthHeaders } from "@/lib/client-auth";

interface IntegrationOfferStepProps {
  industry: string;
  orgId: string;
  onComplete: () => void;
}

export function IntegrationOfferStep({
  industry,
  orgId,
  onComplete,
}: IntegrationOfferStepProps) {
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);

  const providers = (
    INDUSTRY_INTEGRATIONS[industry] ?? INDUSTRY_INTEGRATIONS.consulting
  )
    .map((key) => ({ key, ...INTEGRATION_METADATA[key] }))
    .filter((p) => p.name)
    .slice(0, 3);

  const handleConnect = async (providerKey: string) => {
    setConnecting(providerKey);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch("/api/v1/integrations/nango/connect", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          providerConfigKey: providerKey,
          connectionId: orgId,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.connectUrl) {
          window.open(data.connectUrl, "_blank", "width=500,height=700");
        }
        setConnected((prev) => new Set([...prev, providerKey]));
      }
    } catch (err) {
      console.error("Failed to initiate connection:", err);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          Connect your tools
        </h2>
        <p className="text-[var(--text-secondary)] mt-1 text-sm">
          Connect these to give your agent a head start. It reads structure only
          — no document contents.
        </p>
      </div>

      <div className="space-y-3">
        {providers.map((integration) => {
          const isConnected = connected.has(integration.nangoProviderKey);
          const isConnecting =
            connecting === integration.nangoProviderKey;

          return (
            <div
              key={integration.nangoProviderKey}
              className={`border rounded-xl p-4 transition-colors ${
                isConnected
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-[var(--border)] bg-[var(--bg-surface)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {integration.name}
                </h3>
                {isConnected && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                {integration.description}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  Reads: {integration.whatWeRead}
                </p>
                {!isConnected && (
                  <button
                    onClick={() =>
                      handleConnect(integration.nangoProviderKey)
                    }
                    disabled={isConnecting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plug className="w-3 h-3" />
                    )}
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onComplete}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
        >
          {connected.size > 0 ? "Continue to Dashboard" : "Skip"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {connected.size > 0 && (
        <p className="text-xs text-[var(--text-tertiary)] text-center">
          Your agent is scanning the connected tools in the background. Context
          will appear in your workspace within a minute.
        </p>
      )}
    </div>
  );
}
