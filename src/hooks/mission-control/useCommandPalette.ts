"use client";

import { useState, useCallback, useMemo } from "react";
import { AGENTS } from "@/lib/mission-control/constants";
import type { MCChat, CommandItem } from "@/lib/mission-control/types";

interface UseCommandPaletteOptions {
  chats: MCChat[];
  onSelectChat?: (chatId: string) => void;
  onSelectAgent?: (agentType: string) => void;
  onAction?: (actionId: string) => void;
}

interface UseCommandPaletteReturn {
  isOpen: boolean;
  query: string;
  results: CommandItem[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (q: string) => void;
}

export function useCommandPalette(
  options: UseCommandPaletteOptions
): UseCommandPaletteReturn {
  const { chats, onSelectChat, onSelectAgent, onAction } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setQuery("");
      return !prev;
    });
  }, []);

  // Build searchable items from chats + agents
  const allItems = useMemo((): CommandItem[] => {
    const chatItems: CommandItem[] = chats.map((c) => ({
      id: `chat-${c.id}`,
      type: "chat" as const,
      title: c.title || `${c.agentType} chat`,
      subtitle: c.agentType,
      icon: AGENTS[c.agentType]?.icon,
      action: () => onSelectChat?.(c.id),
    }));

    const agentItems: CommandItem[] = Object.values(AGENTS).map((a) => ({
      id: `agent-${a.type}`,
      type: "agent" as const,
      title: a.name,
      subtitle: a.description,
      icon: a.icon,
      action: () => onSelectAgent?.(a.type),
    }));

    const actionItems: CommandItem[] = [
      {
        id: "action-new-chat",
        type: "action" as const,
        title: "New Chat",
        shortcut: "Cmd+N",
        action: () => onAction?.("new-chat"),
      },
      {
        id: "action-toggle-sidebar",
        type: "action" as const,
        title: "Toggle Sidebar",
        shortcut: "Cmd+B",
        action: () => onAction?.("toggle-sidebar"),
      },
    ];

    return [...actionItems, ...agentItems, ...chatItems];
  }, [chats, onSelectChat, onSelectAgent, onAction]);

  // Filter by query
  const results = useMemo((): CommandItem[] => {
    if (!query.trim()) return allItems;

    const lower = query.toLowerCase();
    return allItems.filter((item) => {
      const searchable = [
        item.title,
        item.subtitle ?? "",
      ]
        .join(" ")
        .toLowerCase();

      // Also search agent capabilities
      if (item.type === "agent") {
        const agentKey = item.id.replace("agent-", "");
        const agent = AGENTS[agentKey];
        if (agent) {
          const caps = agent.capabilities.join(" ").toLowerCase();
          return searchable.includes(lower) || caps.includes(lower);
        }
      }

      return searchable.includes(lower);
    });
  }, [query, allItems]);

  return {
    isOpen,
    query,
    results,
    open,
    close,
    toggle,
    setQuery,
  };
}
