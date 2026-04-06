"use client";

import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { StudioNav } from "../../StudioNav";
import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Brief {
  id: string;
  title: string;
}

const TEMPLATES = [
  { key: "pitch_deck", label: "Pitch Deck", description: "Investor-ready pitch presentation with problem, solution, and traction slides." },
  { key: "case_study", label: "Case Study", description: "Showcase results with challenge, approach, and outcomes structure." },
  { key: "proposal", label: "Proposal", description: "Client proposal with scope, timeline, and pricing slides." },
];

const TEMPLATE_SLIDES: Record<string, { title: string; body: string; notes: string }[]> = {
  pitch_deck: [
    { title: "Title Slide", body: "", notes: "" },
    { title: "Problem", body: "", notes: "" },
    { title: "Solution", body: "", notes: "" },
    { title: "Market Size", body: "", notes: "" },
    { title: "Traction", body: "", notes: "" },
    { title: "Ask", body: "", notes: "" },
  ],
  case_study: [
    { title: "Title Slide", body: "", notes: "" },
    { title: "Challenge", body: "", notes: "" },
    { title: "Approach", body: "", notes: "" },
    { title: "Results", body: "", notes: "" },
    { title: "Testimonial", body: "", notes: "" },
  ],
  proposal: [
    { title: "Title Slide", body: "", notes: "" },
    { title: "Scope", body: "", notes: "" },
    { title: "Timeline", body: "", notes: "" },
    { title: "Pricing", body: "", notes: "" },
    { title: "Next Steps", body: "", notes: "" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function NewDeckPage() {
  const router = useRouter();
  const [blankName, setBlankName] = useState("");
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/briefs", { headers });
        if (res.ok) {
          const data = await res.json();
          setBriefs(data.briefs ?? []);
        }
      } catch { /* silent */ }
    })();
  }, []);

  async function createDeck(title: string, slides?: { title: string; body: string; notes: string }[], briefId?: string) {
    setErr(null);
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/content-studio/decks", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title, slides, briefId }),
      });
      if (!res.ok) { setErr("Failed to create deck."); return; }
      const data = await res.json();
      router.push(`/content-studio/decks/${data.entry.id}`);
    } catch { setErr("Unexpected error."); }
    finally { setSubmitting(false); }
  }

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <StudioNav />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Deck</h1>
        <p className="text-sm text-gray-500 mt-0.5">Choose how to start your presentation.</p>
      </div>

      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Blank Deck */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Blank Deck</h2>
          <p className="text-xs text-gray-500 mb-4">Start from scratch with a single empty slide.</p>
          <input
            value={blankName}
            onChange={(e) => setBlankName(e.target.value)}
            placeholder="Deck name"
            className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
          />
          <button
            disabled={submitting || !blankName.trim()}
            onClick={() => createDeck(blankName.trim())}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Create Blank Deck"}
          </button>
        </div>

        {/* From Brief */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">From Brief</h2>
          <p className="text-xs text-gray-500 mb-4">Generate a deck structure from an existing brief.</p>
          <select
            value={selectedBrief}
            onChange={(e) => setSelectedBrief(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
          >
            <option value="">Select a brief...</option>
            {briefs.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
          <button
            disabled={submitting || !selectedBrief}
            onClick={() => {
              const brief = briefs.find((b) => b.id === selectedBrief);
              if (brief) createDeck(brief.title, undefined, brief.id);
            }}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Create from Brief"}
          </button>
        </div>

        {/* From Template */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">From Template</h2>
          <p className="text-xs text-gray-500 mb-4">Start with a pre-built slide structure.</p>
          <div className="space-y-2">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.key}
                disabled={submitting}
                onClick={() => createDeck(tmpl.label, TEMPLATE_SLIDES[tmpl.key])}
                className={cn(
                  "w-full text-left p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors disabled:opacity-50",
                )}
              >
                <p className="text-sm font-medium text-gray-900">{tmpl.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tmpl.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
