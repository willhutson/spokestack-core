"use client";

import { createContext, useContext } from "react";

export interface ModuleContextValue {
  moduleType: string | null;
  moduleName: string | null;
  agentType: string | null;
  availableAgents: string[];
  currentRoute: string;
  orgSlug: string | null;
}

export const ModuleContext = createContext<ModuleContextValue>({
  moduleType: null,
  moduleName: null,
  agentType: null,
  availableAgents: [],
  currentRoute: "",
  orgSlug: null,
});

export function useModuleContext(): ModuleContextValue {
  return useContext(ModuleContext);
}
