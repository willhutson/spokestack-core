"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import { Step1Org } from "./step-1-org";
import { Step2Modules } from "./step-2-modules";
import { Step3Departments } from "./step-3-departments";
import { Step4Roles } from "./step-4-roles";
import { Step5Team } from "./step-5-team";
import { Step6OrgChart } from "./step-6-org-chart";
import { Step7Branding } from "./step-7-branding";

const STEPS = [
  { key: "org", label: "Org Setup" },
  { key: "modules", label: "Modules" },
  { key: "departments", label: "Departments" },
  { key: "roles", label: "Roles" },
  { key: "team", label: "Team" },
  { key: "orgChart", label: "Org Chart" },
  { key: "branding", label: "Branding" },
];

const DRAFT_KEY = "spokestack-onboarding-draft";

interface OnboardingData {
  [key: string]: unknown;
  domain?: string;
  orgName?: string;
  orgType?: string;
  industry?: string;
  size?: string;
  modules?: string[];
  departments?: { name: string; lead?: string }[];
  roles?: { title: string; department?: string }[];
  team?: { name: string; email: string; role?: string }[];
  orgChart?: { managerId?: string; memberId?: string }[];
  primaryColor?: string;
  logoUrl?: string;
  tagline?: string;
}

function OnboardingWizardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const domain = searchParams.get("domain") ?? "";

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({ domain });
  const [saving, setSaving] = useState(false);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as OnboardingData;
        setData((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save draft to localStorage on data change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data]);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), []);
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/onboarding", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        localStorage.removeItem(DRAFT_KEY);
        router.push("/mission-control");
      }
    } finally {
      setSaving(false);
    }
  }, [data, router]);

  const stepProps = { data, updateData };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Step indicator */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  i === step
                    ? "bg-indigo-600 text-white"
                    : i < step
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-200 text-gray-500",
                )}
              >
                {i + 1}
              </button>
              <span
                className={cn(
                  "hidden text-sm sm:block",
                  i === step ? "font-semibold text-gray-900" : "text-gray-500",
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px w-6", i < step ? "bg-indigo-300" : "bg-gray-300")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {step === 0 && <Step1Org {...stepProps} />}
        {step === 1 && <Step2Modules {...stepProps} />}
        {step === 2 && <Step3Departments {...stepProps} />}
        {step === 3 && <Step4Roles {...stepProps} />}
        {step === 4 && <Step5Team {...stepProps} />}
        {step === 5 && <Step6OrgChart {...stepProps} />}
        {step === 6 && <Step7Branding {...stepProps} />}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <span className="text-sm text-gray-500">
            Step {step + 1} of {STEPS.length}
          </span>
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Complete Setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminOnboardingPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <OnboardingWizardInner />
    </Suspense>
  );
}
