"use client";

import { openChatWithContext } from "@/lib/chat-event";
import ModulePageShell from "@/components/module-page/ModulePageShell";

const icon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.788m13.788 0c3.808 3.808 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

export default function ListeningPage() {
  return (
    <ModulePageShell
      moduleName="Listening"
      moduleDescription="Track brand mentions, sentiment, and competitive signals."
      icon={icon}
      isEmpty={true}
      agentHint="Set up a brand monitor to track mentions of my company."
      onTalkToAgent={openChatWithContext}
    >
      <div />
    </ModulePageShell>
  );
}
