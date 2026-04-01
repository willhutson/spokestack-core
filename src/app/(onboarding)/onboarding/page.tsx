"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const SCAN_STEPS = [
  { icon: "🎨", label: "Detecting logo and brand colors..." },
  { icon: "👥", label: "Analyzing team structure..." },
  { icon: "🏢", label: "Discovering client verticals..." },
  { icon: "📊", label: "Identifying industry vertical..." },
  { icon: "✨", label: "Generating preview..." },
];

export default function OnboardingLandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [complete, setComplete] = useState(false);

  const startScan = useCallback(() => {
    if (!url.trim()) return;
    setScanning(true);
    setActiveStep(0);
  }, [url]);

  // Auto-animate steps 1.2s apart
  useEffect(() => {
    if (!scanning || activeStep < 0) return;
    if (activeStep >= SCAN_STEPS.length) {
      setComplete(true);
      return;
    }
    const timer = setTimeout(() => setActiveStep((s) => s + 1), 1200);
    return () => clearTimeout(timer);
  }, [scanning, activeStep]);

  const handleBuild = useCallback(() => {
    const domain = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    router.push(`/admin/onboarding?domain=${encodeURIComponent(domain)}`);
  }, [url, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6 text-white">
      <div className="w-full max-w-2xl text-center">
        {/* Header */}
        <h1 className="mb-3 text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Spokestack
          </span>
        </h1>
        <p className="mb-10 text-lg text-gray-400">
          Enter your website URL and we will build your workspace automatically.
        </p>

        {/* URL input */}
        <div className="mx-auto mb-8 flex max-w-lg items-center gap-3">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 focus-within:border-indigo-500 transition-colors">
            <svg className="h-5 w-5 text-gray-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startScan()}
              placeholder="Enter your website URL"
              disabled={scanning}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none disabled:opacity-50"
            />
          </div>
          {!scanning && (
            <button
              onClick={startScan}
              disabled={!url.trim()}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Scan
            </button>
          )}
        </div>

        {/* Animated agent activity feed */}
        {scanning && (
          <div className="mx-auto mb-10 max-w-md space-y-3">
            {SCAN_STEPS.map((step, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-500 ${
                    isDone
                      ? "bg-gray-800/50 text-green-400"
                      : isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-600"
                  }`}
                >
                  <span className="text-lg">{isDone ? "✅" : step.icon}</span>
                  <span className="text-sm">{step.label}</span>
                  {isActive && (
                    <div className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Branded preview mockup */}
        {complete && (
          <div className="mx-auto mb-8 max-w-lg">
            <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg font-bold">
                  {url.replace(/^https?:\/\//, "").charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">
                    {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </p>
                  <p className="text-xs text-gray-500">Workspace preview</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["Brand Colors", "Team Map", "Client List"].map((label) => (
                  <div key={label} className="rounded-lg bg-gray-800 px-3 py-4 text-center">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-indigo-400">Ready</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleBuild}
              className="mt-6 w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Build my instance
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
