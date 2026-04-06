"use client";

import Link from "next/link";
import { AgentButton } from "@/components/agents/AgentButton";
import { useModuleContext } from "@/hooks/useModuleContext";
import { ChevronRight } from "lucide-react";

export function ModuleHeader({
  isChatOpen,
  onToggleChat,
}: {
  isChatOpen: boolean;
  onToggleChat: () => void;
}) {
  const { moduleName } = useModuleContext();

  return (
    <header className="h-12 flex items-center justify-between px-6 border-b bg-background/95 backdrop-blur shrink-0">
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/tasks"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Workspace
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium">{moduleName}</span>
      </nav>
      <div className="flex items-center gap-2">
        <AgentButton variant="outline" size="sm" />
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
          ⌘J
        </kbd>
      </div>
    </header>
  );
}
