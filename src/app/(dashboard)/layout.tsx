"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthHeaders } from "@/lib/client-auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { OrgProvider } from "@/lib/context/OrgContext";
import { ThemeProvider, type ThemeName, VALID_THEMES } from "@/components/theme/ThemeProvider";
import { getAvailableModules } from "@/lib/modules/registry";
import type { BillingTierType } from "@prisma/client";

interface InstalledModule {
  moduleType: string;
  name: string;
  active: boolean;
  category: string;
  surfaces: string[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [installed, setInstalled] = useState<InstalledModule[]>([]);
  const [tier, setTier] = useState<BillingTierType>("FREE");
  const [orgName, setOrgName] = useState("Workspace");
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [branding, setBranding] = useState<{
    primaryColor?: string;
    logoUrl?: string;
    theme?: string;
  }>();

  const allModules = getAvailableModules();

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setUserEmail(session.user.email ?? "");

      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        router.replace("/login");
        return;
      }

      setSessionChecked(true);

      // Fetch settings, billing, and installed modules in parallel
      const [settingsRes, billingRes, modulesRes] = await Promise.allSettled([
        fetch("/api/v1/settings", { headers }).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch("/api/v1/billing", { headers }).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch("/api/v1/modules/installed", { headers }).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);

      // Settings
      const settings =
        settingsRes.status === "fulfilled" ? settingsRes.value : null;
      if (settings) {
        if (settings.name) setOrgName(settings.name);
        if (settings.slug) setOrgSlug(settings.slug);
        if (settings.branding) setBranding(settings.branding);
        if (settings.userName) setUserName(settings.userName);
        if (settings.onboardingComplete === false) {
          router.push("/onboarding");
          return;
        } else {
          document.cookie =
            "onboarding_complete=true;path=/;max-age=31536000";
        }
      }

      // Billing
      const billing =
        billingRes.status === "fulfilled" ? billingRes.value : null;
      if (billing?.tier) setTier(billing.tier);

      // Installed modules — enrich with registry metadata
      const modulesData =
        modulesRes.status === "fulfilled" ? modulesRes.value : null;
      if (modulesData?.installed) {
        const enriched: InstalledModule[] = modulesData.installed.map(
          (m: { moduleType: string; active: boolean }) => {
            const entry = allModules.find(
              (r) => r.moduleType === m.moduleType
            );
            return {
              moduleType: m.moduleType,
              name: entry?.name ?? m.moduleType,
              active: m.active,
              category: entry?.category ?? "core",
              surfaces: entry?.surfaces ?? ["dashboard"],
            };
          }
        );
        setInstalled(enriched);
      }
    }

    init();
  }, [router, allModules]);

  if (!sessionChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 animate-pulse" />
      </div>
    );
  }

  const resolvedTheme: ThemeName =
    branding?.theme && VALID_THEMES.includes(branding.theme as ThemeName)
      ? (branding.theme as ThemeName)
      : "obsidian";

  return (
    <div id="theme-root" data-theme={resolvedTheme} className="h-full" style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}>
      <ThemeProvider initialTheme={resolvedTheme}>
        <OrgProvider orgSlug={orgSlug} orgName={orgName}>
          <SidebarProvider>
            <AppSidebar
              installed={installed}
              orgName={orgName}
              userEmail={userEmail}
              userName={userName}
              tier={tier}
              branding={branding}
            />
            <SidebarInset>{children}</SidebarInset>
          </SidebarProvider>
        </OrgProvider>
      </ThemeProvider>
    </div>
  );
}
