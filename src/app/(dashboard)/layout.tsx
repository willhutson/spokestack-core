"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import ChatPanel from "./components/chat-panel";
import ModuleNav from "@/components/dashboard/ModuleNav";
import { getAvailableModules, type RegistryModule } from "@/lib/modules/registry";

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

// Legacy nav items removed — now driven by ModuleNav
const _LEGACY_NAV_UNUSED = [
  {
    label: "Tasks",
    href: "/tasks",
    minTier: "free",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/projects",
    minTier: "starter",
    tierPrice: "$29/mo",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Briefs",
    href: "/briefs",
    minTier: "pro",
    tierPrice: "$59/mo",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    label: "Orders",
    href: "/orders",
    minTier: "business",
    tierPrice: "$149/mo",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
  {
    label: "Marketplace",
    href: "/marketplace",
    minTier: "free",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0A2.999 2.999 0 017.5 6.401l.69-2.485A1.125 1.125 0 019.278 3h5.444c.494 0 .93.32 1.088.816l.69 2.485A2.999 2.999 0 0121 9.349" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    minTier: "free",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitMessage, setChatInitMessage] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>([]);
  const [billingTier, setBillingTier] = useState<string>("FREE");

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
    const supabase = createClient();

    async function fetchModules(token: string, retries = 2): Promise<void> {
      try {
        const res = await fetch("/api/v1/modules/installed", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (retries > 0) {
            // Retry after a short delay (session may not be ready)
            await new Promise((r) => setTimeout(r, 500));
            return fetchModules(token, retries - 1);
          }
          console.error("Failed to fetch modules:", res.status);
          return;
        }
        const data = await res.json();
        if (data.installed) setInstalledModules(data.installed);
      } catch (err) {
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 500));
          return fetchModules(token, retries - 1);
        }
        console.error("Failed to fetch modules:", err);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setSessionChecked(true);
        const authHeaders = { Authorization: `Bearer ${session.access_token}` };

        // Fetch installed modules for the nav
        fetch("/api/v1/modules/installed", { headers: authHeaders })
          .then((r) => r.json())
          .then((data) => {
            if (data.installed) setInstalledModules(data.installed);
          })
          .catch(() => {});

        // Fetch billing tier for nav lock/unlock logic
        fetch("/api/v1/billing", { headers: authHeaders })
          .then((r) => r.json())
          .then((data) => {
            if (data.tier) setBillingTier(data.tier);
          })
          .catch(() => {
            // Default to FREE on failure (already set)
          });
      }
    });
  }, [router]);

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
            S
          </div>
          <span className="font-semibold text-sm text-gray-900 truncate">My Workspace</span>
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
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">User</p>
              <p className="text-xs text-gray-500 truncate">{billingTier ? `${billingTier.charAt(0) + billingTier.slice(1).toLowerCase()} plan` : "Loading..."}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-sm font-medium text-gray-500">My Workspace</h1>
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
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
              U
            </div>
          </div>
        </header>

        {/* Page content — inject openChatWithContext via window event */}
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
