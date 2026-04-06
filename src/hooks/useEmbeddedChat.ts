"use client";

import { useState, useCallback } from "react";
import { useModuleContext } from "./useModuleContext";

export interface Message {
  role: "user" | "agent";
  content: string;
}

interface EmbeddedChatState {
  isOpen: boolean;
  activeAgent: string | null;
  messages: Message[];
}

interface UseEmbeddedChatReturn {
  state: EmbeddedChatState;
  availableAgents: string[];
  toggleChat: () => void;
  openChat: (agentType?: string) => void;
  closeChat: () => void;
  switchAgent: (agentType: string) => void;
}

export function useEmbeddedChat(): UseEmbeddedChatReturn {
  const { agentType, availableAgents } = useModuleContext();

  const [state, setState] = useState<EmbeddedChatState>({
    isOpen: false,
    activeAgent: agentType,
    messages: [],
  });

  const toggleChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const openChat = useCallback(
    (agent?: string) => {
      setState((prev) => ({
        ...prev,
        isOpen: true,
        activeAgent: agent ?? agentType ?? prev.activeAgent,
      }));
    },
    [agentType]
  );

  const closeChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const switchAgent = useCallback((agent: string) => {
    setState((prev) => ({ ...prev, activeAgent: agent }));
  }, []);

  return {
    state,
    availableAgents,
    toggleChat,
    openChat,
    closeChat,
    switchAgent,
  };
}
