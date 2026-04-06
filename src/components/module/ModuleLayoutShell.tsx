"use client";

import { useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  ModuleContext,
  type ModuleContextValue,
} from "@/hooks/useModuleContext";
import { useEmbeddedChat } from "@/hooks/useEmbeddedChat";
import { EmbeddedMissionControl } from "./EmbeddedMissionControl";
import { ModuleHeader } from "./ModuleHeader";
import { useOrg } from "@/lib/context/OrgContext";
import { getModuleByType } from "@/lib/modules/registry";
import type { ModuleType } from "@prisma/client";

interface ModuleLayoutShellProps {
  children: React.ReactNode;
  moduleType: string;
}

export function ModuleLayoutShell({
  children,
  moduleType,
}: ModuleLayoutShellProps) {
  const pathname = usePathname();
  const { orgSlug } = useOrg();
  const registryEntry = getModuleByType(moduleType as ModuleType);

  const contextValue: ModuleContextValue = useMemo(
    () => ({
      moduleType,
      moduleName: registryEntry?.name ?? null,
      agentType: registryEntry?.agentType ?? null,
      availableAgents: registryEntry?.agentType
        ? [registryEntry.agentType]
        : [],
      currentRoute: pathname,
      orgSlug: orgSlug ?? null,
    }),
    [moduleType, registryEntry, pathname, orgSlug]
  );

  return (
    <ModuleContext.Provider value={contextValue}>
      <ModuleLayoutInner>{children}</ModuleLayoutInner>
    </ModuleContext.Provider>
  );
}

function ModuleLayoutInner({ children }: { children: React.ReactNode }) {
  const chat = useEmbeddedChat();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        chat.toggleChat();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chat]);

  return (
    <div className="flex flex-col h-full">
      <ModuleHeader
        isChatOpen={chat.state.isOpen}
        onToggleChat={chat.toggleChat}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        <EmbeddedMissionControl
          isOpen={chat.state.isOpen}
          onClose={chat.closeChat}
          activeAgent={chat.state.activeAgent}
          onSwitchAgent={chat.switchAgent}
          availableAgents={chat.availableAgents}
        />
      </div>
    </div>
  );
}
