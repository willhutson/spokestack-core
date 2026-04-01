"use client";

import { openChatWithContext } from "@/lib/chat-event";
import ModulePageShell from "@/components/module-page/ModulePageShell";

const icon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

export default function AnalyticsPage() {
  return (
    <ModulePageShell
      moduleName="Analytics"
      moduleDescription="Business intelligence dashboards and trend analysis."
      icon={icon}
      isEmpty={true}
      agentHint="Set up a performance dashboard for my workspace."
      onTalkToAgent={openChatWithContext}
    >
      <div />
    </ModulePageShell>
  );
}
