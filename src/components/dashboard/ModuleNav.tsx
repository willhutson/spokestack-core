import Link from "next/link";

interface InstalledModule {
  moduleType: string;
  name: string;
  active: boolean;
  category: string;
  surfaces: string[];
}

interface RegistryModule {
  moduleType: string;
  name: string;
  category: string;
  minTier: string;
  price: number | null;
  surfaces: string[];
}

interface ModuleNavProps {
  installed: InstalledModule[];
  allModules: RegistryModule[];
  currentPath: string;
}

const MODULE_ICONS: Record<string, string> = {
  TASKS: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  PROJECTS:
    "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z",
  BRIEFS:
    "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  ORDERS:
    "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  CRM: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
};

const MODULE_HREF: Record<string, string> = {
  TASKS: "/tasks",
  PROJECTS: "/projects",
  BRIEFS: "/briefs",
  ORDERS: "/orders",
  CRM: "/crm",
  SOCIAL_PUBLISHING: "/social-publishing",
  CONTENT_STUDIO: "/content-studio",
  ANALYTICS: "/analytics",
  SURVEYS: "/surveys",
  BOARDS: "/boards",
  TIME_LEAVE: "/time-leave",
  FINANCE: "/finance",
};

function getHref(moduleType: string): string {
  return MODULE_HREF[moduleType] ?? `/${moduleType.toLowerCase().replace(/_/g, "-")}`;
}

function getIcon(moduleType: string): string {
  return (
    MODULE_ICONS[moduleType] ??
    "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281"
  );
}

export default function ModuleNav({
  installed,
  allModules,
  currentPath,
}: ModuleNavProps) {
  const installedSet = new Set(installed.map((m) => m.moduleType));

  // Core modules that have dashboard surfaces
  const coreModules = allModules.filter(
    (m) => m.category === "core" && m.surfaces.includes("dashboard")
  );

  // Marketplace modules that are installed
  const marketplaceInstalled = installed.filter(
    (m) =>
      m.category !== "core" &&
      m.active &&
      m.surfaces.includes("dashboard")
  );

  // Available but not installed (show as locked)
  const available = allModules.filter(
    (m) =>
      m.category !== "core" &&
      !installedSet.has(m.moduleType) &&
      m.surfaces.includes("dashboard")
  );

  return (
    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
      {/* Core modules */}
      {coreModules.map((mod) => {
        const isInstalled = installedSet.has(mod.moduleType);
        const href = getHref(mod.moduleType);
        const active = currentPath.startsWith(href);

        if (!isInstalled) {
          return (
            <div
              key={mod.moduleType}
              className="group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-gray-400 cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={getIcon(mod.moduleType)}
                />
              </svg>
              <span className="text-sm">{mod.name}</span>
              <svg
                className="w-3.5 h-3.5 ml-auto opacity-60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg">
                  Upgrade to {mod.minTier} to unlock
                </div>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={mod.moduleType}
            href={href}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
              active
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={getIcon(mod.moduleType)}
              />
            </svg>
            <span>{mod.name}</span>
          </Link>
        );
      })}

      {/* Installed marketplace modules */}
      {marketplaceInstalled.length > 0 && (
        <>
          <div className="pt-3 pb-1 px-2.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Modules
            </span>
          </div>
          {marketplaceInstalled.map((mod) => {
            const href = getHref(mod.moduleType);
            const active = currentPath.startsWith(href);
            return (
              <Link
                key={mod.moduleType}
                href={href}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={getIcon(mod.moduleType)}
                  />
                </svg>
                <span>{mod.name}</span>
              </Link>
            );
          })}
        </>
      )}

      {/* Mission Control — always visible */}
      <div className="pt-3 pb-1 px-2.5">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Operations
        </span>
      </div>
      <Link
        href="/mission-control"
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
          currentPath === "/mission-control"
            ? "bg-indigo-50 text-indigo-700 font-medium"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
          />
        </svg>
        <span>Mission Control</span>
      </Link>

      {/* Static nav items: Marketplace + Settings */}
      <div className="pt-3 pb-1 px-2.5">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          System
        </span>
      </div>
      <Link
        href="/marketplace"
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
          currentPath === "/marketplace"
            ? "bg-indigo-50 text-indigo-700 font-medium"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35"
          />
        </svg>
        <span>Marketplace</span>
      </Link>
      <Link
        href="/settings"
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
          currentPath === "/settings"
            ? "bg-indigo-50 text-indigo-700 font-medium"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>Settings</span>
      </Link>
    </nav>
  );
}
