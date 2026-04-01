"use client";

import { openChatWithContext } from "@/lib/chat-event";
import ModulePageShell from "@/components/module-page/ModulePageShell";

const icon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v3.75m0 10.5V21m7.5-18v3.75m0 10.5V21" />
  </svg>
);

export default function WorkflowsPage() {
  return (
    <ModulePageShell
      moduleName="Workflows"
      moduleDescription="Multi-step automation with triggers and conditions."
      icon={icon}
      isEmpty={true}
      agentHint="Help me set up an automation workflow."
      onTalkToAgent={openChatWithContext}
    >
      <div />
    </ModulePageShell>
  );
}
