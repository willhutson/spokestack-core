"use client";

import { useState } from "react";
import { getAuthHeaders } from "@/lib/client-auth";

const CATEGORIES = [
  "Sales", "Marketing", "Operations", "HR", "Finance",
  "Intelligence", "Automation", "Research", "Advertising", "Productivity",
];

const INDUSTRIES = [
  "", "Technology", "Healthcare", "Finance", "Retail", "Manufacturing",
  "Education", "Real Estate", "Legal", "Logistics", "Media",
];

const PRICING_TYPES = [
  { key: "free", label: "Free" },
  { key: "paid", label: "One-time Payment" },
  { key: "subscription", label: "Monthly Subscription" },
] as const;

const STEPS = ["Module Info", "Tools", "Agent Prompt", "Pricing", "Review & Submit"];

const BLOCKED_PATH_PATTERNS = [/\/admin/i, /\/auth/i, /\/marketplace/i];
const VALID_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const currencyFmt = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ToolDef {
  method?: string;
  path?: string;
  url?: string;
  [key: string]: unknown;
}

interface ToolValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateTools(raw: string): ToolValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw.trim()) {
    return { valid: false, errors: ["Tool definitions are required."], warnings };
  }

  let parsed: ToolDef[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, errors: ["Invalid JSON. Please paste a valid JSON array."], warnings };
  }

  if (!Array.isArray(parsed)) {
    return { valid: false, errors: ["Must be a JSON array of tool definitions."], warnings };
  }

  if (parsed.length === 0) {
    return { valid: false, errors: ["At least one tool definition is required."], warnings };
  }

  parsed.forEach((tool, idx) => {
    const prefix = `Tool [${idx}]`;
    if (!tool.path || typeof tool.path !== "string") {
      errors.push(`${prefix}: missing or invalid "path" field.`);
    } else {
      if (!tool.path.startsWith("/api/v1/")) {
        errors.push(`${prefix}: path must start with /api/v1/.`);
      }
      BLOCKED_PATH_PATTERNS.forEach((pat) => {
        if (pat.test(tool.path as string)) {
          errors.push(`${prefix}: path "${tool.path}" contains a blocked segment.`);
        }
      });
    }

    if (tool.url && typeof tool.url === "string") {
      if (tool.url.startsWith("http://") || tool.url.startsWith("https://")) {
        errors.push(`${prefix}: external URLs are not allowed.`);
      }
    }

    if (tool.method && typeof tool.method === "string") {
      if (!VALID_METHODS.includes(tool.method.toUpperCase())) {
        warnings.push(`${prefix}: "${tool.method}" is not a standard HTTP method.`);
      }
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now/i,
  /disregard\s+(all\s+)?(above|prior)/i,
  /system\s*:\s*/i,
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  /jailbreak/i,
];

function detectInjections(text: string): string[] {
  const found: string[] = [];
  INJECTION_PATTERNS.forEach((pat) => {
    if (pat.test(text)) {
      found.push(`Potential injection pattern detected: ${pat.source}`);
    }
  });
  return found;
}

export default function PublishWizardPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; moduleId?: string; status?: string; error?: string } | null>(null);

  // Step 1: Module Info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [category, setCategory] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");

  // Step 2: Tools
  const [toolsJson, setToolsJson] = useState("");

  // Step 3: Agent Prompt
  const [systemPrompt, setSystemPrompt] = useState("");

  // Step 4: Pricing
  const [pricingType, setPricingType] = useState<"free" | "paid" | "subscription">("free");
  const [priceAed, setPriceAed] = useState("");

  function handleNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  function handleSlugChange(v: string) {
    setSlug(v);
    setSlugEdited(true);
  }

  // Validation per step
  function isStep1Valid(): boolean {
    return name.trim().length > 0 && slug.trim().length > 0 && category.length > 0 && description.trim().length > 0 && shortDescription.trim().length > 0 && shortDescription.length <= 120;
  }

  function isStep2Valid(): boolean {
    return validateTools(toolsJson).valid;
  }

  function isStep3Valid(): boolean {
    return systemPrompt.length >= 50 && systemPrompt.length <= 10000;
  }

  function isStep4Valid(): boolean {
    if (pricingType === "free") return true;
    const cents = Math.round(parseFloat(priceAed) * 100);
    return !isNaN(cents) && cents > 0;
  }

  function isCurrentStepValid(): boolean {
    if (step === 0) return isStep1Valid();
    if (step === 1) return isStep2Valid();
    if (step === 2) return isStep3Valid();
    if (step === 3) return isStep4Valid();
    return true;
  }

  const toolValidation = step === 1 ? validateTools(toolsJson) : null;
  const injectionWarnings = step === 2 ? detectInjections(systemPrompt) : [];

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const headers = await getAuthHeaders();
      const priceCents = pricingType !== "free" ? Math.round(parseFloat(priceAed) * 100) : undefined;
      const body = {
        name: name.trim(),
        slug: slug.trim(),
        category: category.toLowerCase(),
        industry: industry || undefined,
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        tools: JSON.parse(toolsJson),
        systemPrompt,
        pricing: {
          type: pricingType,
          ...(pricingType === "paid" && { priceCents }),
          ...(pricingType === "subscription" && { monthlyPriceCents: priceCents }),
        },
      };

      const res = await fetch("/api/v1/marketplace/publish", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, moduleId: data.moduleId ?? data.id, status: data.status ?? "pending_review" });
      } else {
        setSubmitResult({ success: false, error: data.error ?? `Publish failed (${res.status})` });
      }
    } catch (err) {
      console.error("Publish error:", err);
      setSubmitResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Publish Module</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">Submit a new module for review and publishing</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  i < step
                    ? "bg-[var(--accent)] text-[var(--primary-foreground)]"
                    : i === step
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] ring-2 ring-indigo-600"
                    : "bg-[var(--bg-surface)] text-[var(--text-tertiary)]"
                }`}
              >
                {i < step ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-[10px] mt-1 whitespace-nowrap ${i === step ? "text-[var(--accent)] font-medium" : "text-[var(--text-tertiary)]"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mt-[-14px] ${i < step ? "bg-[var(--accent)]" : "bg-[var(--bg-surface)]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
        {/* Step 1: Module Info */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Module Information</h2>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Module"
                className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-awesome-module"
                className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Auto-generated from name. You can edit it.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Industry (optional)</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  <option value="">None</option>
                  {INDUSTRIES.filter(Boolean).map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Short Description * (max 120 chars)</label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value.slice(0, 120))}
                rows={2}
                placeholder="A brief summary of what this module does"
                className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
              />
              <p className={`text-[10px] mt-0.5 ${shortDescription.length > 110 ? "text-amber-600" : "text-gray-400"}`}>
                {shortDescription.length}/120
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Detailed description of the module, its features, and use cases"
                className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: Tools */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Tool Definitions</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Paste a JSON array of tool definitions. Each tool must have a <code className="bg-[var(--bg-surface)] px-1 rounded">path</code> starting with <code className="bg-[var(--bg-surface)] px-1 rounded">/api/v1/</code> and a valid HTTP method.
            </p>
            <textarea
              value={toolsJson}
              onChange={(e) => setToolsJson(e.target.value)}
              rows={14}
              placeholder={`[\n  {\n    "method": "POST",\n    "path": "/api/v1/my-tool/run",\n    "name": "run_tool",\n    "description": "Runs my tool"\n  }\n]`}
              className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
            />
            {toolValidation && toolValidation.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {toolValidation.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">{err}</p>
                ))}
              </div>
            )}
            {toolValidation && toolValidation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                {toolValidation.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-700">{w}</p>
                ))}
              </div>
            )}
            {toolValidation && toolValidation.valid && toolsJson.trim() && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-xs text-green-700">All tool definitions are valid.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Agent Prompt */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">System Prompt</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Define the system prompt for the module agent. Minimum 50 characters, maximum 10,000.
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value.slice(0, 10000))}
              rows={14}
              placeholder="You are a helpful assistant that..."
              className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-between">
              <p className={`text-[10px] ${systemPrompt.length < 50 ? "text-red-500" : systemPrompt.length > 9500 ? "text-amber-600" : "text-gray-400"}`}>
                {systemPrompt.length.toLocaleString()}/10,000 characters
                {systemPrompt.length < 50 && " (minimum 50)"}
              </p>
            </div>
            {injectionWarnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                <p className="text-xs font-medium text-yellow-800 mb-1">Potential prompt injection detected:</p>
                {injectionWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-700">{w}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Pricing */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pricing</h2>
            <div className="space-y-3">
              {PRICING_TYPES.map((pt) => (
                <label
                  key={pt.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    pricingType === pt.key
                      ? "border-indigo-300 bg-[var(--accent-subtle)]"
                      : "border-[var(--border)] hover:bg-[var(--bg-base)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="pricing"
                    value={pt.key}
                    checked={pricingType === pt.key}
                    onChange={() => setPricingType(pt.key as "free" | "paid" | "subscription")}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{pt.label}</span>
                </label>
              ))}
            </div>
            {pricingType !== "free" && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Price (AED) {pricingType === "subscription" && "/ month"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">AED</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={priceAed}
                    onChange={(e) => setPriceAed(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-[var(--border-strong)] rounded-lg pl-12 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  />
                </div>
                {priceAed && !isNaN(parseFloat(priceAed)) && parseFloat(priceAed) > 0 && (
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    {currencyFmt.format(parseFloat(priceAed))} = {Math.round(parseFloat(priceAed) * 100)} fils (cents)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Review & Submit</h2>

            {submitResult?.success && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 mb-4">
                <p className="text-sm font-medium text-green-800 mb-1">Module submitted successfully!</p>
                <p className="text-xs text-green-700">Module ID: <span className="font-mono">{submitResult.moduleId}</span></p>
                <p className="text-xs text-green-700">Status: <span className="font-medium">{submitResult.status}</span></p>
              </div>
            )}

            {submitResult && !submitResult.success && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                <p className="text-sm text-red-700">{submitResult.error}</p>
              </div>
            )}

            {!submitResult?.success && (
              <>
                <div className="bg-[var(--bg-base)] rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Name</span>
                    <span className="text-[var(--text-primary)] font-medium">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Slug</span>
                    <span className="text-[var(--text-primary)] font-mono text-xs">{slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Category</span>
                    <span className="text-[var(--text-primary)]">{category}</span>
                  </div>
                  {industry && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Industry</span>
                      <span className="text-[var(--text-primary)]">{industry}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Short Description</span>
                    <span className="text-[var(--text-primary)] text-right max-w-[60%]">{shortDescription}</span>
                  </div>
                  <div className="border-t border-[var(--border)] pt-3">
                    <span className="text-[var(--text-secondary)]">Description</span>
                    <p className="text-[var(--text-primary)] mt-1 text-xs whitespace-pre-wrap">{description}</p>
                  </div>
                  <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                    <span className="text-[var(--text-secondary)]">Tools</span>
                    <span className="text-[var(--text-primary)]">{toolsJson ? JSON.parse(toolsJson).length : 0} tool(s)</span>
                  </div>
                  <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                    <span className="text-[var(--text-secondary)]">System Prompt</span>
                    <span className="text-[var(--text-primary)]">{systemPrompt.length.toLocaleString()} chars</span>
                  </div>
                  <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                    <span className="text-[var(--text-secondary)]">Pricing</span>
                    <span className="text-[var(--text-primary)]">
                      {pricingType === "free" && "Free"}
                      {pricingType === "paid" && `${currencyFmt.format(parseFloat(priceAed || "0"))} one-time`}
                      {pricingType === "subscription" && `${currencyFmt.format(parseFloat(priceAed || "0"))}/mo`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-[var(--accent)] text-[var(--primary-foreground)] text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    "Submit for Review"
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {!submitResult?.success && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          {step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!isCurrentStepValid()}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--primary-foreground)] hover:bg-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
