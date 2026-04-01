"use client";

import { useState, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { MC_API } from "@/lib/mission-control/constants";
import type { MCChat } from "@/lib/mission-control/types";

interface UseChatListReturn {
  chats: MCChat[];
  isLoading: boolean;
  selectedChatId: string | null;
  setSelectedChatId: (id: string | null) => void;
  loadChats: (status?: string) => Promise<void>;
  createChat: (
    agentType: string,
    options?: { title?: string }
  ) => Promise<MCChat | null>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  clearAllChats: () => Promise<void>;
}

export function useChatList(): UseChatListReturn {
  const [chats, setChats] = useState<MCChat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const loadChats = useCallback(async (status?: string) => {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const url = status
        ? `${MC_API.chats}?status=${status}`
        : MC_API.chats;
      const res = await fetch(url, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setChats(data.chats ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createChat = useCallback(
    async (
      agentType: string,
      options?: { title?: string }
    ): Promise<MCChat | null> => {
      const headers = await getAuthHeaders();
      const res = await fetch(MC_API.chats, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ agentType, title: options?.title }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const chat: MCChat = data.chat;
      setChats((prev) => [chat, ...prev]);
      setSelectedChatId(chat.id);
      return chat;
    },
    []
  );

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(MC_API.chat(chatId), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, ...data.chat } : c))
      );
    },
    []
  );

  const archiveChat = useCallback(
    async (chatId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(MC_API.chat(chatId), {
        method: "DELETE",
        headers,
      });
      if (!res.ok) return;
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      setSelectedChatId((prev) => (prev === chatId ? null : prev));
    },
    []
  );

  const clearAllChats = useCallback(async () => {
    const headers = await getAuthHeaders();
    await Promise.all(
      chats.map((c) =>
        fetch(MC_API.chat(c.id), { method: "DELETE", headers })
      )
    );
    setChats([]);
    setSelectedChatId(null);
  }, [chats]);

  return {
    chats,
    isLoading,
    selectedChatId,
    setSelectedChatId,
    loadChats,
    createChat,
    renameChat,
    archiveChat,
    clearAllChats,
  };
}
