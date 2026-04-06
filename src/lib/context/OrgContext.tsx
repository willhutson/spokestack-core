"use client";

import { createContext, useContext } from "react";

interface OrgContextValue {
  orgSlug: string | null;
  orgName: string;
}

const OrgCtx = createContext<OrgContextValue>({
  orgSlug: null,
  orgName: "Workspace",
});

export function OrgProvider({
  children,
  orgSlug,
  orgName,
}: OrgContextValue & { children: React.ReactNode }) {
  return (
    <OrgCtx.Provider value={{ orgSlug, orgName }}>{children}</OrgCtx.Provider>
  );
}

export function useOrg(): OrgContextValue {
  return useContext(OrgCtx);
}
