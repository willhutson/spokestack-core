"use client";
import { useRouter } from "next/navigation";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { BriefsNav } from "../BriefsNav";

const BRIEF_TYPES = [
  {
    type: "CREATIVE",
    icon: "\u{1F3A8}",
    name: "Creative",
    description: "Design assets, visual content, and creative deliverables",
  },
  {
    type: "CAMPAIGN",
    icon: "\u{1F4E2}",
    name: "Campaign",
    description: "Multi-channel marketing campaigns with objectives and KPIs",
  },
  {
    type: "SOCIAL",
    icon: "\u{1F4F1}",
    name: "Social",
    description: "Social media content planning and scheduling",
  },
  {
    type: "STRATEGY",
    icon: "\u{1F9ED}",
    name: "Strategy",
    description: "Strategic planning documents and recommendations",
  },
  {
    type: "REPORT",
    icon: "\u{1F4CA}",
    name: "Report",
    description: "Analytics reports, performance reviews, and insights",
  },
  {
    type: "PROPOSAL",
    icon: "\u{1F4DD}",
    name: "Proposal",
    description: "Client proposals, project scopes, and estimates",
  },
  {
    type: "RFP",
    icon: "\u{1F4E9}",
    name: "RFP",
    description: "Request for proposal responses and bid documents",
  },
] as const;

export default function BriefsNewPage() {
  const router = useRouter();

  return (
    <ModuleLayoutShell moduleType="BRIEFS">
      <div className="p-6">
        <BriefsNav />

        {/* Breadcrumb */}
        <nav className="text-sm text-[var(--text-secondary)] mb-6">
          <span
            className="hover:text-[var(--text-secondary)] cursor-pointer"
            onClick={() => router.push("/briefs")}
          >
            Briefs
          </span>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)] font-medium">New</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create a New Brief</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Select the type of brief you want to create
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {BRIEF_TYPES.map((bt) => (
            <button
              key={bt.type}
              onClick={() => router.push(`/briefs/new/${bt.type.toLowerCase()}`)}
              className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              <div className="text-3xl mb-3">{bt.icon}</div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                {bt.name}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                {bt.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
