"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { BriefsNav } from "../../BriefsNav";
import { getAuthHeaders } from "@/lib/client-auth";

const VALID_TYPES = ["creative", "campaign", "social", "strategy", "report", "proposal", "rfp"];

const CHANNEL_OPTIONS = ["Email", "Social", "PPC", "SEO", "Display", "Video", "Print", "Events"];
const PLATFORM_OPTIONS = ["Instagram", "Twitter/X", "LinkedIn", "TikTok", "Facebook", "YouTube", "Pinterest"];

export default function BriefsNewTypePage() {
  const router = useRouter();
  const params = useParams();
  const type = (params.type as string).toLowerCase();
  const typeLabel = type.toUpperCase();

  // Common fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  // Creative fields
  const [deliverables, setDeliverables] = useState("");
  const [budget, setBudget] = useState("");
  const [brandGuidelines, setBrandGuidelines] = useState("");

  // Campaign fields
  const [objectives, setObjectives] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [kpis, setKpis] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  // Social fields
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [contentPillars, setContentPillars] = useState("");
  const [postingFrequency, setPostingFrequency] = useState("");

  // Generic fields
  const [scope, setScope] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!VALID_TYPES.includes(type)) {
    return (
      <ModuleLayoutShell moduleType="BRIEFS">
        <div className="p-6">
          <BriefsNav />
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Invalid brief type</h3>
            <p className="text-xs text-gray-500 mb-4">The type &quot;{type}&quot; is not recognized.</p>
            <button
              onClick={() => router.push("/briefs/new")}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Back to New Brief
            </button>
          </div>
        </div>
      </ModuleLayoutShell>
    );
  }

  function toggleMulti(value: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);

    const metadata: Record<string, unknown> = { type: typeLabel, priority, dueDate: dueDate || undefined };

    if (type === "creative") {
      metadata.deliverables = deliverables.split("\n").filter(Boolean);
      metadata.budget = budget;
      metadata.brandGuidelines = brandGuidelines;
    } else if (type === "campaign") {
      metadata.objectives = objectives;
      metadata.channels = channels;
      metadata.kpis = kpis;
      metadata.targetAudience = targetAudience;
    } else if (type === "social") {
      metadata.platforms = platforms;
      metadata.contentPillars = contentPillars.split("\n").filter(Boolean);
      metadata.postingFrequency = postingFrequency;
    } else {
      metadata.scope = scope;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/briefs", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          metadata,
          status: "DRAFT",
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        setError(body || res.statusText);
        return;
      }
      router.push("/briefs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const textareaClass =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
      <div className="p-6">
        <BriefsNav />

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <span className="hover:text-gray-700 cursor-pointer" onClick={() => router.push("/briefs")}>
            Briefs
          </span>
          <span className="mx-2">/</span>
          <span className="hover:text-gray-700 cursor-pointer" onClick={() => router.push("/briefs/new")}>
            New
          </span>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium capitalize">{type}</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          New {type.charAt(0).toUpperCase() + type.slice(1)} Brief
        </h1>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          {/* Common fields */}
          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief title" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the brief..." className={textareaClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Creative fields */}
          {type === "creative" && (
            <>
              <div>
                <label className={labelClass}>Deliverables (one per line)</label>
                <textarea value={deliverables} onChange={(e) => setDeliverables(e.target.value)} rows={4} placeholder="Logo design&#10;Social media banners&#10;Print flyer" className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Budget</label>
                <input type="text" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. $5,000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Brand Guidelines</label>
                <textarea value={brandGuidelines} onChange={(e) => setBrandGuidelines(e.target.value)} rows={4} placeholder="Describe brand colors, fonts, tone of voice..." className={textareaClass} />
              </div>
            </>
          )}

          {/* Campaign fields */}
          {type === "campaign" && (
            <>
              <div>
                <label className={labelClass}>Objectives</label>
                <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={3} placeholder="Campaign objectives..." className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Channels</label>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_OPTIONS.map((ch) => (
                    <button key={ch} type="button" onClick={() => toggleMulti(ch, channels, setChannels)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${channels.includes(ch) ? "bg-indigo-100 border-indigo-300 text-indigo-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                    >{ch}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>KPIs</label>
                <textarea value={kpis} onChange={(e) => setKpis(e.target.value)} rows={2} placeholder="Key performance indicators..." className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Target Audience</label>
                <textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} rows={2} placeholder="Describe the target audience..." className={textareaClass} />
              </div>
            </>
          )}

          {/* Social fields */}
          {type === "social" && (
            <>
              <div>
                <label className={labelClass}>Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((pl) => (
                    <button key={pl} type="button" onClick={() => toggleMulti(pl, platforms, setPlatforms)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${platforms.includes(pl) ? "bg-indigo-100 border-indigo-300 text-indigo-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                    >{pl}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Content Pillars (one per line)</label>
                <textarea value={contentPillars} onChange={(e) => setContentPillars(e.target.value)} rows={3} placeholder="Educational&#10;Entertaining&#10;Promotional" className={textareaClass} />
              </div>
              <div>
                <label className={labelClass}>Posting Frequency</label>
                <input type="text" value={postingFrequency} onChange={(e) => setPostingFrequency(e.target.value)} placeholder="e.g. 3x per week" className={inputClass} />
              </div>
            </>
          )}

          {/* Generic fields for strategy/report/proposal/rfp */}
          {["strategy", "report", "proposal", "rfp"].includes(type) && (
            <div>
              <label className={labelClass}>Scope</label>
              <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={5} placeholder="Define the scope of this brief..." className={textareaClass} />
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating..." : "Create Brief"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/briefs/new")}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ModuleLayoutShell>
  );
}
