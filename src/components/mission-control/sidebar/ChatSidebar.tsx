"use client";

import type { MCChat } from "@/lib/mission-control/types";
import { cn } from "@/lib/utils";
import { AgentSwitcher } from "./AgentSwitcher";
import { ChatCard } from "./ChatCard";

interface ChatSidebarProps {
  chats: MCChat[];
  activeChatId: string | null;
  collapsed: boolean;
  onSelectChat: (id: string) => void;
  onNewChat: (agentType: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onArchiveChat: (id: string) => void;
  onToggle: () => void;
}

export function ChatSidebar({
  chats,
  activeChatId,
  collapsed,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onArchiveChat,
  onToggle,
}: ChatSidebarProps) {
  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-gray-800 bg-gray-950 py-3">
        <button
          onClick={onToggle}
          className="rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-white transition-colors"
          title="Expand sidebar"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-r border-gray-800 bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Chats</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNewChat("assistant")}
            className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-white transition-colors"
            title="New chat"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-white transition-colors"
            title="Collapse sidebar (⌘B)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Agent pills */}
      <AgentSwitcher onSelect={onNewChat} />

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {chats.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-[var(--text-secondary)]">
            No chats yet. Start one above.
          </p>
        ) : (
          chats.map((chat) => (
            <ChatCard
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              onClick={() => onSelectChat(chat.id)}
              onRename={onRenameChat}
              onArchive={onArchiveChat}
            />
          ))
        )}
      </div>
    </div>
  );
}
