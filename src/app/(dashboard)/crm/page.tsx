"use client";

import { openChatWithContext } from "@/lib/chat-event";
import ModulePageShell from "@/components/module-page/ModulePageShell";

const icon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2.25 2.25 0 013 16.878v-.003c0-1.113.285-2.16.786-3.07M12.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

export default function CRMPage() {
  return (
    <ModulePageShell
      moduleName="CRM"
      moduleDescription="Manage client relationships, deals, and pipeline."
      icon={icon}
      isEmpty={true}
      agentHint="Help me set up my CRM — import contacts and create a deal pipeline."
      onTalkToAgent={openChatWithContext}
    >
      <div />
    </ModulePageShell>
  );
}
