"use client";

import { openChatWithContext } from "@/lib/chat-event";
import ModulePageShell from "@/components/module-page/ModulePageShell";

const icon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.75.75 0 01-1.006-.293 19.836 19.836 0 01-1.712-4.025m2.853-5.356c-.253-.962-.584-1.892-.985-2.783a1.125 1.125 0 01.463-1.511l.657-.38a.75.75 0 011.006.293 19.836 19.836 0 011.712 4.025M15.75 9h3.75m-3.75 3H21m-3.75 3h3.75" />
  </svg>
);

export default function SocialPublishingPage() {
  return (
    <ModulePageShell
      moduleName="Social Publishing"
      moduleDescription="Schedule and publish across social channels."
      icon={icon}
      isEmpty={true}
      agentHint="Connect a social account and schedule my first post."
      onTalkToAgent={openChatWithContext}
    >
      <div />
    </ModulePageShell>
  );
}
