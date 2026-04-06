"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AGENTS } from "@/lib/mission-control/constants";
import type { AgentArtifact } from "@/lib/mission-control/agent-builder-client";
import {
  useChatList,
  useNotifications,
  useKeyboardShortcuts,
  useCommandPalette,
} from "@/hooks/mission-control";
import { ChatSidebar } from "../sidebar/ChatSidebar";
import { ChatPane } from "../chat/ChatPane";
import { ArtifactPanel } from "../artifacts/ArtifactPanel";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "../command-palette/CommandPalette";
import { NotificationBell } from "../notifications/NotificationBell";

const MIN_SIDEBAR_W = 220;
const MAX_SIDEBAR_W = 420;
const DEFAULT_SIDEBAR_W = 300;

export function MissionControlLayout() {
  // Chat list hook (updated API)
  const {
    chats,
    isLoading: chatsLoading,
    selectedChatId,
    setSelectedChatId,
    loadChats,
    createChat,
    renameChat,
    archiveChat,
  } = useChatList();

  // Notifications hook (updated API)
  const { unreadCount } = useNotifications();

  // Artifact pane state
  const [selectedArtifact, setSelectedArtifact] = useState<AgentArtifact | null>(null);

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_W);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(DEFAULT_SIDEBAR_W);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Selected chat and its agent type
  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );
  const agentType = selectedChat?.agentType ?? undefined;

  // Command palette hook (updated API)
  const commandPalette = useCommandPalette({
    chats,
    onSelectChat: (chatId) => {
      setSelectedChatId(chatId);
      commandPalette.close();
    },
    onSelectAgent: async (type) => {
      commandPalette.close();
      await handleNewChat(type);
    },
    onAction: (actionId) => {
      commandPalette.close();
      if (actionId === "new-chat") handleNewChat("assistant");
      if (actionId === "toggle-sidebar") setSidebarCollapsed((v) => !v);
    },
  });

  // Keyboard shortcuts (updated API)
  useKeyboardShortcuts({
    onNewChat: () => handleNewChat("assistant"),
    onToggleSidebar: () => setSidebarCollapsed((v) => !v),
    onCommandPalette: () => commandPalette.toggle(),
    onClose: () => {
      if (commandPalette.isOpen) commandPalette.close();
    },
  });

  // Create a new chat
  const handleNewChat = useCallback(
    async (type: string) => {
      const agent = AGENTS[type];
      const title = agent ? `New ${agent.name} chat` : `New ${type} chat`;
      await createChat(type, { title });
    },
    [createChat],
  );

  // Resize handling
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      startXRef.current = e.clientX;
      startWRef.current = sidebarWidth;

      const onMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = ev.clientX - startXRef.current;
        const next = Math.min(Math.max(startWRef.current + delta, MIN_SIDEBAR_W), MAX_SIDEBAR_W);
        setSidebarWidth(next);
      };
      const onUp = () => {
        resizingRef.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [sidebarWidth],
  );

  // Last message time
  const lastMessageTime = useMemo(() => {
    if (chats.length === 0) return null;
    const times = chats
      .map((c) => c.lastActivityAt ?? c.updatedAt ?? c.createdAt)
      .map((t) => new Date(t).getTime());
    return new Date(Math.max(...times));
  }, [chats]);

  const connectedAgents = Object.keys(AGENTS).length;

  return (
    <div className="flex h-full flex-col bg-gray-950 text-white">
      {/* Top bar */}
      <header className="flex h-12 items-center justify-between border-b border-gray-800 bg-gray-950 px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-wide">
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Mission Control
            </span>
          </h1>
          {chatsLoading && (
            <div className="h-3 w-3 animate-spin rounded-full border border-gray-600 border-t-indigo-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => commandPalette.toggle()}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[var(--bg-base)] px-3 py-1.5 text-xs text-[var(--text-tertiary)] transition-colors hover:border-gray-600"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Search...
            <kbd className="rounded border border-gray-700 px-1 text-[10px]">⌘K</kbd>
          </button>
          <NotificationBell
            unreadCount={unreadCount}
            onClick={() => setNotificationsOpen((v) => !v)}
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          style={{ width: sidebarCollapsed ? 48 : sidebarWidth }}
          className="shrink-0 transition-[width] duration-200"
        >
          <ChatSidebar
            chats={chats}
            activeChatId={selectedChatId}
            collapsed={sidebarCollapsed}
            onSelectChat={setSelectedChatId}
            onNewChat={handleNewChat}
            onRenameChat={(id, title) => renameChat(id, title)}
            onArchiveChat={(id) => archiveChat(id)}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        </div>

        {/* Resize handle */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={handleResizeStart}
            className="w-1 cursor-col-resize bg-[var(--bg-surface)] transition-colors hover:bg-[var(--accent)]/50"
          />
        )}

        {/* Chat pane */}
        <div className="flex-1 overflow-hidden">
          <ChatPane
            chatId={selectedChatId}
            agentType={agentType}
            onCreateChat={async (type) => {
              await handleNewChat(type);
            }}
            onArtifactClick={setSelectedArtifact}
          />
        </div>

        {/* Artifact panel (conditional) */}
        <ArtifactPanel
          artifact={selectedArtifact}
          onClose={() => setSelectedArtifact(null)}
        />
      </div>

      {/* Status bar */}
      <StatusBar
        connectedAgents={connectedAgents}
        lastMessageTime={lastMessageTime}
      />

      {/* Command palette overlay */}
      <CommandPalette
        open={commandPalette.isOpen}
        query={commandPalette.query}
        items={commandPalette.results}
        onQueryChange={commandPalette.setQuery}
        onSelect={(item) => {
          item.action?.();
          commandPalette.close();
        }}
        onClose={commandPalette.close}
      />

      {/* Notification panel placeholder */}
      {notificationsOpen && (
        <div className="fixed right-4 top-14 z-40 w-80 rounded-xl border border-gray-700 bg-[var(--bg-base)] p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <button
              onClick={() => setNotificationsOpen(false)}
              className="text-[var(--text-secondary)] hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {unreadCount === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-4 text-center">No new notifications</p>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
          )}
        </div>
      )}
    </div>
  );
}
