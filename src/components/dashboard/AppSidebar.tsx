"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  FileText,
  FolderKanban,
  ShoppingCart,
  Users,
  Send,
  Palette,
  BarChart3,
  ClipboardList,
  Clock,
  DollarSign,
  Radio,
  GitBranch,
  Store,
  Zap,
  Lock,
  ChevronUp,
  LogOut,
  Settings,
  UserCircle,
  Megaphone,
  GraduationCap,
  ThumbsUp,
  Globe,
  MessageCircle,
  UserCheck,
  Shield,
  Code,
  Wrench,
  Newspaper,
  AlertTriangle,
  PieChart,
  Star,
  Calendar,
  Kanban,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvailableModules } from "@/lib/modules/registry";
import { createClient } from "@/lib/supabase/client";
import type { BillingTierType } from "@prisma/client";

// Icon registry — keyed by registry.json iconName field
const ICON_REGISTRY: Record<string, LucideIcon> = {
  CheckCircle,
  FileText,
  FolderKanban,
  ShoppingCart,
  Users,
  Send,
  Palette,
  BarChart3,
  ClipboardList,
  Kanban,
  Clock,
  DollarSign,
  Radio,
  GitBranch,
  Zap,
  Store,
  Megaphone,
  GraduationCap,
  ThumbsUp,
  Globe,
  MessageCircle,
  UserCheck,
  Shield,
  Code,
  Wrench,
  Newspaper,
  AlertTriangle,
  PieChart,
  Star,
  Calendar,
  Lock,
};

function getModuleIcon(iconName: string): LucideIcon {
  return ICON_REGISTRY[iconName] ?? FileText;
}

interface InstalledModule {
  moduleType: string;
  name: string;
  active: boolean;
  category: string;
  surfaces: string[];
}

interface AppSidebarProps {
  installed: InstalledModule[];
  orgName: string;
  userEmail: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  tier: BillingTierType;
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
  };
}

const TIER_ORDER: BillingTierType[] = [
  "FREE",
  "STARTER",
  "PRO",
  "BUSINESS",
  "ENTERPRISE",
];

const CATEGORY_LABELS: Record<string, string> = {
  marketing: "Marketing",
  ops: "Operations",
  analytics: "Analytics",
  enterprise: "Enterprise",
};

export function AppSidebar({
  installed,
  orgName,
  userEmail,
  userName,
  userAvatarUrl,
  tier,
  branding,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const allModules = getAvailableModules();
  const installedSet = new Set(installed.map((m) => m.moduleType));

  // Core modules — always shown
  const coreModules = allModules.filter(
    (m) => m.category === "core" && m.surfaces.includes("dashboard")
  );

  // Installed non-core modules grouped by category
  const installedByCategory = useMemo(() => {
    const map = new Map<string, typeof allModules>();
    for (const mod of installed) {
      if (mod.category === "core" || !mod.active) continue;
      if (!mod.surfaces.includes("dashboard")) continue;
      const entry = allModules.find((m) => m.moduleType === mod.moduleType);
      if (!entry) continue;
      const cat = entry.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(entry);
    }
    return map;
  }, [installed, allModules]);

  const tierIdx = TIER_ORDER.indexOf(tier);
  const orgInitial = orgName.charAt(0).toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <Sidebar
      className="border-r"
      style={
        branding?.primaryColor
          ? ({ "--sidebar-primary": branding.primaryColor } as React.CSSProperties)
          : undefined
      }
    >
      {/* Header — org branding */}
      <SidebarHeader className="px-4 py-3 border-b">
        <div className="flex items-center gap-2.5">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={orgName}
              className="w-7 h-7 rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{
                backgroundColor: branding?.primaryColor || "#6366F1",
              }}
            >
              {orgInitial}
            </div>
          )}
          <span className="font-semibold text-sm truncate">{orgName}</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        {/* Core modules */}
        <SidebarGroup>
          <SidebarGroupLabel>Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreModules.map((mod) => {
                const Icon = getModuleIcon(mod.iconName);
                const modTierIdx = TIER_ORDER.indexOf(mod.minTier);
                const locked = modTierIdx > tierIdx;
                const isActive = pathname.startsWith(mod.href);

                return (
                  <SidebarMenuItem key={mod.moduleType}>
                    {locked ? (
                      <SidebarMenuButton
                        className="opacity-50 cursor-not-allowed"
                        title={`Requires ${mod.minTier} plan`}
                      >
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <span>{mod.name}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={mod.href}>
                          <Icon className="w-4 h-4" />
                          <span>{mod.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Installed modules by category */}
        {Array.from(installedByCategory.entries()).map(([category, mods]) => (
          <SidebarGroup key={category}>
            <SidebarGroupLabel>
              {CATEGORY_LABELS[category] || category}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mods.map((mod) => {
                  const Icon = getModuleIcon(mod.iconName);
                  const isActive = pathname.startsWith(mod.href);

                  return (
                    <SidebarMenuItem key={mod.moduleType}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={mod.href}>
                          <Icon className="w-4 h-4" />
                          <span>{mod.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarSeparator />

        {/* Marketplace link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/marketplace")}
                >
                  <Link href="/marketplace">
                    <Store className="w-4 h-4" />
                    <span>Marketplace</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t p-0">
        {/* Mission Control CTA */}
        <Link
          href="/mission-control"
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 border-b hover:bg-muted/50 transition-colors",
            pathname.startsWith("/mission-control") && "bg-primary/10"
          )}
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-emerald-600">
            Mission Control
          </span>
        </Link>

        {/* User dropdown */}
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {userAvatarUrl ? (
                      <img
                        src={userAvatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      (userName ?? userEmail).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-medium truncate max-w-[120px]">
                      {userName ?? "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {userEmail}
                    </span>
                  </div>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
