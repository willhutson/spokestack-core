"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthHeaders } from "@/lib/client-auth";
import ChatPanel from "./components/chat-panel";
import ModuleNav from "@/components/dashboard/ModuleNav";
import { getAvailableModules } from "@/lib/modules/registry";

interface InstalledModule {
  moduleType: string;
  name: string;
  active: boolean;
  category: string;
  surfaces: string[];
}

// Static registry data (available at build time)
const ALL_MODULES = getAvailableModules().map((m) => ({
  moduleType: m.moduleType,
  name: m.name,
  category: m.category,
  minTier: m.minTier,
  price: m.price,
  surfaces: m.surfaces,
}));

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitMessage, setChatInitMessage] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>([]);
  const [billingTier, setBillingTier] = useState<string>("FREE");
  const [orgName, setOrgName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  // Listen for "open chat with context" events from module pages
  useEffect(() => {
    function handleOpenChat(e: Event) {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      setChatInitMessage(detail.message);
      setChatOpen(true);
    }
    window.addEventListener("spokestack:open-chat", handleOpenChat);
    return () => window.removeEventListener("spokestack:open-chat", handleOpenChat);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // Set user email from session
      setUserEmail(session.user.email ?? "");

      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        router.replace("/login");
        return;
      }

      setSessionChecked(true);

      // Fetch settings (org name + onboarding check)
      try {
        const res = await fetch("/api/v1/settings", { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.name) setOrgName(data.name);
          if (data.onboardingComplete === false) {
            router.push("/onboarding");
            return;
          } else {
            // Set cookie indicating onboarding is done
            document.cookie = "onboarding_complete=true;path=/;max-age=31536000";
          }
        }
      } catch {
        // Settings fetch failed, continue with defaults
      }

      // Fetch billing tier
      try {
        const res = await fetch("/api/v1/billing", { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.tier) setBillingTier(data.tier);
        }
      } catch {
        // Default to FREE on failure
      }

      // Fetch installed modules for the nav
      try {
        const res = await fetch("/api/v1/modules/installed", { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.installed) setInstalledModules(data.installed);
        }
      } catch {
        // Nav will work without installed modules
      }
    }

    init();
  }, [router]);

  const emailInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "?";
  const tierLabel = billingTier
    ? billingTier.charAt(0).toUpperCase() + billingTier.slice(1).toLowerCase() + " plan"
    : "Loading...";

  if (!sessionChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        {/* Workspace header */}
        <div className="h-14 px-4 flex items-center border-b border-gray-200">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2.5">
            {orgName ? orgName.charAt(0).toUpperCase() : "S"}
          </div>
          <span className="font-semibold text-sm text-gray-900 truncate">
            {orgName || "Workspace"}
          </span>
        </div>

        {/* Navigation — dynamic, driven by installed modules */}
        <ModuleNav
          installed={installedModules}
          allModules={ALL_MODULES}
          currentPath={pathname}
          tier={billingTier}
        />

        {/* User section */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">
              {emailInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userEmail || "User"}</p>
              <p className="text-xs text-gray-500 truncate">{tierLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-sm font-medium text-gray-500">{orgName || "Workspace"}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Agent
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">
              {emailInitial}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <ChatPanel
          onClose={() => { setChatOpen(false); setChatInitMessage(""); }}
          initialMessage={chatInitMessage}
        />
      )}
    </div>
  );
}
